const writegif = require('writegif');
const { exec } = require('shelljs');
const { map, range } = require('lodash');
const { writeFileSync } = require('fs');
const glob = require('glob');
const { unlinkSync } = require('fs');
const getImageInfo = require('../utils/get-image-info');
const getScenes = require('../utils/get-scenes');
const crypto = require('crypto');

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

const transformFrames = async (
  file,
  transformFn,
  alwaysUseBaseFrame = false,
  postProcessFn = null
) => {
  let image = await fileToFrames(file);
  if (transformFn) {
    const numFrames = image.frames.length;
    let base = image.frames[0].data;
    for (let i = 0; i < numFrames; i++) {
      const frame = image.frames[i].data;
      const buf = transformFn(base, frame, i, numFrames, image);
      image.frames[i].data = buf;
      if (!alwaysUseBaseFrame) {
        base = buf;
      }
    }
  }
  if (postProcessFn) {
    image = postProcessFn(image);
  }
  await framesToFile(image, file);
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

const getFrameRange = async (file) => {
  const scenes = await getScenes(file);
  const lastScene = scenes.last;
  if (lastScene) {
    return lastScene;
  } else {
    const imageInfo = getImageInfo(file);
    return [0, imageInfo.numFrames - 1];
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
  return `${start} ${instructions.join(' ')} ${end} -delete ${0}-${
    numFrames - 1
  } -coalesce`;
};

const getFrameRangeCmd = (frameStart, frameEnd, numFrames, cmd) => {
  const start = frameStart > 0 ? `\\( -clone 0-${frameStart - 1} \\)` : '';
  const end =
    frameEnd < numFrames - 1
      ? `\\( -clone ${frameEnd + 1}-${numFrames - 1} \\)`
      : '';

  return `${start} \\( -clone ${frameStart}-${frameEnd} ${cmd} \\) ${end} -delete 0-${
    numFrames - 1
  }`;
};

const execCmd = (cmd) => {
  if (!cmd) {
    return;
  }
  const result = exec(cmd, { silent: true });
  if (result.code !== 0) {
    console.log(`🐞 Oops: ${result.stderr}\n> ${cmd}`);
  }
  return result.stdout;
};

parseImageMagickMetrics = (metricsString) => {
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

const getSimpleTransformCmd = async (file, transformCmd) => {
  const { numFrames } = await getImageInfo(file);
  const [start, end] = await getFrameRange(file);
  const cmd = getFrameRangeCmd(start, end, numFrames, transformCmd);
  return `convert "${file}" ${cmd} "${file}"`;
};

const getDrawCommand = (file, pointSets, { fill, effects } = {}) => {
  const { width, height } = getImageInfo(file);
  const polygons = pointSets
    .map(
      (points) =>
        `-draw "polygon ${points.map(({ x, y }) => `${x},${y}`).join(' ')}"`
    )
    .join(' ');
  return `convert "${file}" \\( -size ${width}x${height} xc:transparent -fill ${fill} ${polygons} ${effects} \\) -composite "${file}"`;
};

const getRawDrawCommand = (file, draw, { fill = '', effects = '' } = {}) => {
  const { width, height } = getImageInfo(file);
  return `convert "${file}" \\( -size ${width}x${height} xc:transparent -fill "${fill}" ${draw} ${effects} \\) -composite "${file}"`;
};

const getAsStills = (file) => {
  const { numFrames } = getImageInfo(file);

  if (numFrames < 2) {
    return [[file], () => null, () => null, () => file];
  }

  const md5 = crypto.createHash('md5').update(file).digest('hex');
  execCmd(`convert -coalesce "${file}" "${md5}-%05d.png"`);

  const files = glob.sync(`${md5}-*.png`);
  const deleteFiles = () => {
    for (const file of files) {
      unlinkSync(file);
    }
  };
  const getAtIndex = (index) => {
    return files[index % files.length];
  };
  const collapse = () => {
    const origDelay = execCmd(
      `convert "${file}" -format "%T\n" info: | head -n 1`
    ).replace(/[\n\r]/, '');
    console.log(`💉 Collapsing frames into GIF`);
    execCmd(`convert "${md5}-*.png" "${file}"`);
    console.log(`💉 Setting delay to ${origDelay}`);
    execCmd(`convert -delay ${origDelay.trim()} "${file}" "${file}"`);
  };

  return [files, deleteFiles, collapse, getAtIndex];
};

const processAsStills = async (
  file,
  callback,
  precallback = null,
  additionalCmd = ''
) => {
  const { numFrames } = getImageInfo(file);

  if (numFrames < 2) {
    console.log('📷 Image is a still, processing');
    if (precallback) {
      await precallback(file, 1, 1);
    }
    await callback(file, 1, 1);
    return;
  }

  const origDelay = execCmd(
    `convert "${file}" -format "%T\n" info: | head -n 1`
  ).replace(/[\n\r]/, '');
  console.log(`🔨 Expanding GIF into ${numFrames} frames`);
  execCmd(`convert -coalesce "${file}" "${file}-%05d.png"`);

  const files = glob.sync(`${file}-*.png`);

  if (precallback) {
    for (let i = 0; i < files.length; i++) {
      console.log(`🎞️  Pre-processing frame ${i}`);
      await precallback(files[i], i / (files.length - 1), i, files);
    }
  }

  for (let i = 0; i < files.length; i++) {
    console.log(`🎞️  Processing frame ${i}`);
    await callback(files[i], i / (files.length - 1), i, files);
  }

  console.log(`💉 Collapsing frames into GIF`);
  execCmd(`convert "${file}-*.png" ${additionalCmd} "${file}"`);
  console.log(`💉 Setting delay to ${origDelay}`);
  execCmd(`convert -delay ${origDelay.trim()} "${file}" "${file}"`);

  for (const file of files) {
    unlinkSync(file);
  }
};

const mixImages = (buffer1, buffer2, weight) => {
  let data = Buffer.allocUnsafe(buffer1.length);
  buffer1.copy(data);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = data[i] * weight + buffer2[i] * (1 - weight);
    data[i + 1] = data[i + 1] * weight + buffer2[i + 1] * (1 - weight);
    data[i + 2] = data[i + 2] * weight + buffer2[i + 2] * (1 - weight);
    data[i + 3] = data[i + 3] * weight + buffer2[i + 3] * (1 - weight);
  }
  return data;
};

module.exports = {
  getFrameRange,
  getFrameRangeCmd,
  getCropCommand,
  transformFrames,
  execCmd,
  getRawDrawCommand,
  getProgressiveCmd,
  getSimpleTransformCmd,
  parseImageMagickMetrics,
  getDrawCommand,
  processAsStills,
  framesToFile,
  getAsStills,
  mixImages
};
