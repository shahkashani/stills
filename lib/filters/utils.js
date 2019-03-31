const readimage = require('readimage');
const writegif = require('writegif');
const { exec } = require('shelljs');
const { map } = require('lodash');
const { readFile, writeFileSync } = require('fs');

const transformFrames = (file, transformFn, alwaysUseBaseFrame = false) => {
  return new Promise((resolve, reject) => {
    readFile(file, (err, buffer) => {
      if (err) {
        return reject(err);
      }
      readimage(buffer, (err, image) => {
        if (err) {
          return reject(err);
        }
        let base = image.frames[0].data;
        for (var i = 0; i < image.frames.length; i++) {
          const frame = image.frames[i].data;
          const buf = transformFn(base, frame);
          image.frames[i].data = buf;
          if (!alwaysUseBaseFrame) {
            base = buf;
          }
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

module.exports = {
  getImageInfo,
  getCropCommand,
  transformFrames
};
