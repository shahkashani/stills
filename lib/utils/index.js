const { readFile } = require('fs');
const { exec } = require('shelljs');
const readimage = require('readimage');

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

module.exports = {
  fileToFrames,
  getImageInfo
};
