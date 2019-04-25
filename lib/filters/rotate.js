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
      0,
      numFrames,
      numFrames,
      progress => `-distort SRT ${this.degrees * progress}`
    );
    execCmd(`convert "${file}" ${rotation} "${file}"`);
  }
}

module.exports = FilterRotate;
