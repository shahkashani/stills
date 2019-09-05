const { exec } = require('shelljs');
const { getCropCommand } = require('./utils');
const { range } = require('lodash');

class FilterDistortion {
  constructor({ heightFactor = 0.6, widthFactor = 0 } = {}) {
    this.heightFactor = Math.max(Math.min(heightFactor, 1), 0);
    this.widthFactor = Math.max(Math.min(widthFactor, 1), 0);
  }

  get name() {
    return 'distortion';
  }

  getInstructionsGif(width, height, numFrames) {
    const deltaW = (this.widthFactor * width) / numFrames;
    const deltaH = (this.heightFactor * height) / numFrames;

    return range(0, numFrames).map(index => {
      const newWidth = Math.floor(width - deltaW * index);
      const newHeight = Math.floor(height - deltaH * index);

      return {
        index,
        width: newWidth,
        height: newHeight,
        x: 0,
        y: 0
      };
    });
  }

  getInstructionsStill(width, height) {
    return [
      {
        width: width * this.widthFactor,
        height: height * this.heightFactor,
        x: 0,
        y: 0,
        index: 0
      }
    ];
  }

  async apply(file, imageInfo) {
    const { numFrames, width, height } = imageInfo;
    const instructions =
      numFrames > 1
        ? this.getInstructionsGif(width, height, numFrames)
        : this.getInstructionsStill(width, height);

    const cmd = getCropCommand(file, width, height, instructions, {
      gravity: 'center'
    });

    const result = exec(cmd);
    if (result.code !== 0) {
      console.log(`🐞 Oops: ${result.stderr}\n> ${cmd}`);
    }
  }
}

module.exports = FilterDistortion;
