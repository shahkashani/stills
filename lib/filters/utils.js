const readimage = require('readimage');
const writegif = require('writegif');
const { exec } = require('shelljs');
const { map, range, sortBy } = require('lodash');
const { readFile, writeFileSync } = require('fs');
const pixelmatch = require('pixelmatch');
const glob = require('glob');
const { unlinkSync } = require('fs');

const fileToFrames = file => {
  return new Promise((resolve, reject) => {
    readFile(file, (err, buffer) => {
      if (err) {
        return reject(err);
      }
      readimage(buffer, (err, image) => {
        if (err) {
          return reject(err);
        }
        resolve(image);
      });
    });
  });
};

const framesToFile = (image, file) => {
  return new Promise((resolve, reject) => {
    writegif(image, { quality: 1 }, (err, tracerBuffer) => {
      if (err) {
        return reject(err);
      }
      writeFileSync(file, tracerBuffer);
      resolve();
    });
  });
};

const getSceneChanges = async (file, threshold = 0.1) => {
  const image = await fileToFrames(file);
  const result = [
    {
      frame: 0,
      diff: 0
    }
  ];
  for (let i = 1; i < image.frames.length; i++) {
    const frameA = image.frames[i - 1].data;
    const frameB = image.frames[i].data;
    var numDiffPixels = pixelmatch(
      frameA,
      frameB,
      null,
      image.width,
      image.height,
      { threshold }
    );
    result.push({
      frame: i,
      diff: numDiffPixels
    });
  }
  const sortedResult = sortBy(result, 'diff').reverse();
  return sortedResult;
};

const getLastScene = async file => {
  const changes = await getSceneChanges(file);
  const numFrames = changes.length;
  const numLateFrame = Math.ceil(numFrames - numFrames / 4);
  const lateChangesRemoved = changes.filter(
    change => change.frame < numLateFrame
  );
  /*
  const significantEndFrames = changes
    .slice(0, 3)
    .filter(change => change.frame >= numLateFrame);
    const endFrame = significantEndFrames.length
    ? significantEndFrames[0].frame
    : numFrames - 1;
*/
  const endFrame = numFrames - 1;
  return {
    start: lateChangesRemoved[0].frame,
    end: endFrame
  };
};

const transformFrames = async (
  file,
  transformFn,
  alwaysUseBaseFrame = false,
  postProcesFn = null
) => {
  let image = await fileToFrames(file);
  if (transformFn) {
    const numFrames = image.frames.length;
    let base = image.frames[0].data;
    for (let i = 0; i < numFrames; i++) {
      const frame = image.frames[i].data;
      const buf = transformFn(base, frame, i, numFrames);
      image.frames[i].data = buf;
      if (!alwaysUseBaseFrame) {
        base = buf;
      }
    }
  }
  if (postProcesFn) {
    image = postProcesFn(image);
  }
  await framesToFile(image, file);
};

const getImageInfo = file => {
  const cmd = `identify -format "%n:%w:%h\n" "${file}" | head -1`;
  const result = exec(cmd, { silent: true });
  if (result.code !== 0) {
    return null;
  }
  const out = result.stdout
    .trim()
    .split(':')
    .map(v => parseInt(v, 10));
  const [numFrames, width, height] = out;
  return { numFrames, width, height };
};

const getCropCommand = (
  file,
  imageWidth,
  imageHeight,
  instructions,
  { gravity = null } = {}
) => {
  const gravityCmd = gravity ? `-gravity ${gravity}` : '';
  const cmdClone = instructions
    .map(({ width, height, x, y, index, delay }) => {
      const delayCmd = delay ? `-set delay ${delay}` : '';
      return `\\( -clone ${index} ${gravityCmd} -crop ${width}x${height}+${x}+${y} ${delayCmd} -resize ${imageWidth}x${imageHeight}! +repage \\)`;
    })
    .join(' ');
  const indexes = map(instructions, 'index').join(',');
  return `convert "${file}" ${cmdClone} -delete ${indexes} -coalesce "${file}"`;
};

const getFrameRange = async (file, detectSceneChange) => {
  if (detectSceneChange) {
    const scene = await getLastScene(file);
    return scene;
  } else {
    const imageInfo = getImageInfo(file);
    return {
      start: 0,
      end: imageInfo.numFrames - 1
    };
  }
};

const getProgressiveCmd = (frameStart, frameEnd, numFrames, callback) => {
  const start = frameStart > 0 ? `\\( -clone 0-${frameStart - 1} \\)` : '';
  const end =
    frameEnd < numFrames - 1
      ? `\\( -clone ${frameEnd + 1}-${numFrames - 1} \\)`
      : '';
  const numAnimationFrames = frameEnd - frameStart;
  const instructions = range(frameStart, frameEnd + 1).map(
    (frame, i) => `\\( -clone ${frame} ${callback(i / numAnimationFrames)} \\)`
  );
  return `${start} ${instructions.join(' ')} ${end} -delete ${0}-${numFrames -
    1} -coalesce`;
};

const getFrameRangeCmd = (frameStart, frameEnd, numFrames, cmd) => {
  const start = frameStart > 0 ? `\\( -clone 0-${frameStart - 1} \\)` : '';
  const end =
    frameEnd < numFrames - 1
      ? `\\( -clone ${frameEnd + 1}-${numFrames - 1} \\)`
      : '';

  return `${start} \\( -clone ${frameStart}-${frameEnd} ${cmd} \\) ${end} -delete 0-${numFrames -
    1}`;
};

const execCmd = cmd => {
  const result = exec(cmd, { silent: true });
  if (result.code !== 0) {
    console.log(`🐞 Oops: ${result.stderr}\n> ${cmd}`);
  }
  return result.stdout;
};

parseImageMagickMetrics = metricsString => {
  const metrics = metricsString
    .split(/\n/)
    .reduce((metricsMemo, metricLine) => {
      if (
        metricLine.indexOf(';') === -1 ||
        metricLine.indexOf('Metrics') !== 0
      ) {
        return metricsMemo;
      }
      const metricsArray = metricLine.replace('Metrics: ', '').split('; ');
      const formattedMetrics = metricsArray.reduce((memo, metric) => {
        const [key, value] = metric.split(': ');
        if (key && value) {
          memo[key] = value;
        }
        return memo;
      }, {});
      metricsMemo.push(formattedMetrics);
      return metricsMemo;
    }, []);
  const rowResults = [];
  const seenTexts = {};
  // We get metrics for every single character, so just grab the lines, i.e. abort on dupes
  for (let i = metrics.length; (i -= 1); i >= 0) {
    const key = JSON.stringify(metrics[i]);
    if (seenTexts[key]) {
      return rowResults;
    }
    rowResults.unshift(metrics[i]);
    seenTexts[key] = true;
  }
  return rowResults;
};

const getSimpleTransformCmd = async (file, detectSceneChange, transformCmd) => {
  const { numFrames } = await getImageInfo(file);
  const { start, end } = await getFrameRange(file, detectSceneChange);
  const cmd = getFrameRangeCmd(start, end, numFrames, transformCmd);
  return `convert "${file}" ${cmd} "${file}"`;
};

const getDrawCommand = (file, pointSets, { fill, effects }) => {
  const { width, height } = getImageInfo(file);
  const polygons = pointSets
    .map(
      points =>
        `-draw "polygon ${points.map(({ x, y }) => `${x},${y}`).join(' ')}"`
    )
    .join(' ');
  return `convert "${file}" \\( -size ${width}x${height} xc:transparent -fill ${fill} ${polygons} ${effects} \\) -composite "${file}"`;
};

const processAsStills = async (file, callback) => {
  const { numFrames } = getImageInfo(file);

  if (numFrames < 2) {
    console.log('📷 Image is a still, processing');
    await callback(file, 1);
    return;
  }

  console.log(`🔨 Expanding GIF into ${numFrames} frames`);
  execCmd(`convert -coalesce "${file}" "${file}-%05d.png"`);

  const files = glob.sync(`${file}-*.png`);

  for (let i = 0; i < files.length; i++) {
    console.log(`🎞️  Processing frame ${i}`);
    await callback(files[i], i / (files.length - 1));
  }

  console.log(`💉 Collapsing frames into GIF`);
  execCmd(`convert "${file}-*.png" -delay 0 "${file}"`);

  for (const file of files) {
    unlinkSync(file);
  }
};

module.exports = {
  getSceneChanges,
  getFrameRange,
  getLastScene,
  getImageInfo,
  getFrameRangeCmd,
  getCropCommand,
  transformFrames,
  execCmd,
  getProgressiveCmd,
  getSimpleTransformCmd,
  parseImageMagickMetrics,
  getDrawCommand,
  processAsStills
};
