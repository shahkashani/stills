const { execCmd, getSimpleTransformCmd } = require('./utils');

class FilterFlip {
  constructor({ detectSceneChange = true } = {}) {
    this.detectSceneChange = detectSceneChange;
  }

  get name() {
    return 'flip';
  }

  async apply(file) {
    const cmd = await getSimpleTransformCmd(
      file,
      this.detectSceneChange,
      '-flip'
    );
    execCmd(cmd);
  }
}

module.exports = FilterFlip;
