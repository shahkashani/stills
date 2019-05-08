const { execCmd, getSimpleTransformCmd } = require('./utils');

class FilterReverse {
  constructor({ detectSceneChange = true } = {}) {
    this.detectSceneChange = detectSceneChange;
  }

  get name() {
    return 'reverse';
  }

  async apply(file) {
    const cmd = await getSimpleTransformCmd(
      file,
      this.detectSceneChange,
      '-reverse'
    );
    execCmd(cmd);
  }
}

module.exports = FilterReverse;
