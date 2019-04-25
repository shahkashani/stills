const {
  execCmd,
  getProgressiveCmd,
  getImageInfo,
  getFrameRange
} = require('./utils');

class FilterSwirl {
  constructor({ degrees = 360, detectSceneChange = true } = {}) {
    this.detectSceneChange = detectSceneChange;
    this.degrees = degrees;
  }

  get name() {
    return 'swirl';
  }

  async apply(file) {
    const { numFrames } = getImageInfo(file);
    const { start, end } = await getFrameRange(file, this.detectSceneChange);
    const swirl = getProgressiveCmd(
      start,
      end,
      numFrames,
      progress => `-swirl ${this.degrees * progress}`
    );
    execCmd(`convert "${file}" ${swirl} "${file}"`);
  }
}

module.exports = FilterSwirl;
