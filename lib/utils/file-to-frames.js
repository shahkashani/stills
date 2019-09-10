const { readFile } = require('fs');
const readimage = require('readimage');

function fileToFrames(file) {
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
}

module.exports = fileToFrames;
