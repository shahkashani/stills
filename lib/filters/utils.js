const readimage = require('readimage');
const writegif = require('writegif');
const { exec } = require('shelljs');
const { map, range } = require('lodash');
const { readFile, writeFileSync } = require('fs');

const transformFrames = (
  file,
  transformFn,
  alwaysUseBaseFrame = false,
  postProcesFn = null
) => {
  return new Promise((resolve, reject) => {
    readFile(file, (err, buffer) => {
      if (err) {
        return reject(err);
      }
      readimage(buffer, (err, image) => {
        if (err) {
          return reject(err);
        }
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
        writegif(image, { quality: 1 }, (err, tracerBuffer) => {
          if (err) {
            return reject(err);
          }
          writeFileSync(file, tracerBuffer);
          resolve();
        });
      });
    });
  });
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

const getProgressiveCmd = (callback, frameEnd, frameStart = 1) => {
  const realFrameStart = frameStart - 1;
  const numFrames = frameEnd - realFrameStart;
  const instructions = range(realFrameStart, frameEnd).map(
    (frame, i) => `\\( -clone ${frame} ${callback((i + 1) / numFrames)} \\)`
  );
  return `${instructions.join(' ')} -delete ${realFrameStart}-${frameEnd -
    1} -coalesce`;
};

const execCmd = cmd => {
  const result = exec(cmd, { silent: true });
  if (result.code !== 0) {
    console.log(`🐞 Oops: ${result.stderr}\n> ${cmd}`);
  }
  return result;
};

module.exports = {
  getImageInfo,
  getCropCommand,
  transformFrames,
  execCmd,
  getProgressiveCmd
};
