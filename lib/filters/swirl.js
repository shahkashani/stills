const { execCmd, getProgressiveCmd, getFrameRange } = require('./utils');

class FilterSwirl {
  constructor({ degrees = 360, detectSceneChange = true } = {}) {
    this.detectSceneChange = detectSceneChange;
    this.degrees = degrees;
  }

  get name() {
    return 'swirl';
  }

  async apply(file) {
    const { start, end } = await getFrameRange(file, this.detectSceneChange);
    const swirl = getProgressiveCmd(
      progress => `-swirl ${this.degrees * progress}`,
      end,
      start
    );
    execCmd(`convert "${file}" ${swirl} "${file}"`);
  }
}

module.exports = FilterSwirl;
