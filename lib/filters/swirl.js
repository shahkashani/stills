const { execCmd, getProgressiveCmd, getFrameRange } = require('./utils');

class FilterSwirl {
  constructor({ degrees = 360 } = {}) {
    this.degrees = degrees;
  }

  get name() {
    return 'swirl';
  }

  async apply(file, imageInfo, globals) {
    const { numFrames } = imageInfo;
    const [start, end] = await getFrameRange(file, globals);
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
