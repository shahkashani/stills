const { exec } = require('shelljs');
const { getImageInfo, getCropCommand } = require('./utils');
const { range } = require('lodash');

class FilterDistortion {
  constructor({ heightFactor = 0.6, widthFactor = 0 } = {}) {
    this.heightFactor = Math.max(Math.min(heightFactor, 1), 0);
    this.widthFactor = Math.max(Math.min(widthFactor, 1), 0);
  }

  get name() {
    return 'distortion';
  }

  getInstructionsGif(width, height, frameCount) {
    const deltaW = (this.widthFactor * width) / frameCount;
    const deltaH = (this.heightFactor * height) / frameCount;

    return range(0, frameCount).map(index => {
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
    return {
      width,
      height,
      x: 0,
      y: 0,
      index: 0
    };
  }

  async apply(file) {
    const { frameCount, width, height } = getImageInfo(file);
    const instructions =
      frameCount > 1
        ? this.getInstructionsGif(width, height, frameCount)
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
