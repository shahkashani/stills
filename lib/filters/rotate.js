const {
  execCmd,
  getProgressiveCmd,
  getImageInfo,
  getFrameRange
} = require('./utils');

class FilterRotate {
  constructor({ degrees = 25, detectSceneChange = true } = {}) {
    this.degrees = degrees;
    this.detectSceneChange = detectSceneChange;
  }

  get name() {
    return 'rotate';
  }

  async apply(file) {
    const { numFrames } = getImageInfo(file);
    const { start, end } = await getFrameRange(file, this.detectSceneChange);
    const rotation = getProgressiveCmd(
      start,
      end,
      numFrames,
      progress => `-distort SRT ${this.degrees * progress}`
    );
    execCmd(`convert "${file}" ${rotation} "${file}"`);
  }
}

module.exports = FilterRotate;
