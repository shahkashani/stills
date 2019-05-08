const { execCmd, getSimpleTransformCmd } = require('./utils');

class FilterFlop {
  constructor({ detectSceneChange = true } = {}) {
    this.detectSceneChange = detectSceneChange;
  }

  get name() {
    return 'flop';
  }

  async apply(file) {
    const cmd = await getSimpleTransformCmd(
      file,
      this.detectSceneChange,
      '-flop'
    );
    execCmd(cmd);
  }
}

module.exports = FilterFlop;
