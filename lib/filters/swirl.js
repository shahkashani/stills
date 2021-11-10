const { execCmd, getProgressiveCmd, getFrameRange } = require('./utils');

class FilterSwirl {
  constructor({ degrees = 360 } = {}) {
    this.degrees = degrees;
  }

  get name() {
    return 'swirl';
  }

  async applyFrames(frames) {
    const file = frames.file;
    const { numFrames } = frames.getInfo();
    const [start, end] = await getFrameRange(file);
    const swirl = getProgressiveCmd(
      start,
      end,
      numFrames,
      (progress) => `-swirl ${this.degrees * progress}`
    );
    execCmd(`convert "${file}" ${swirl} "${file}"`);
  }
}

module.exports = FilterSwirl;
