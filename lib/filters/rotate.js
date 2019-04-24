const { execCmd, getProgressiveCmd, getImageInfo } = require('./utils');

class FilterRotate {
  constructor({ degrees = 20 } = {}) {
    this.degrees = degrees;
  }

  get name() {
    return 'rotate';
  }

  async apply(file) {
    const { numFrames } = getImageInfo(file);
    const rotation = getProgressiveCmd(
      progress => `-distort SRT ${this.degrees * progress}`,
      numFrames
    );
    execCmd(`convert "${file}" ${rotation} "${file}"`);
  }
}

module.exports = FilterRotate;
