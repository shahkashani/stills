const { execCmd, getSimpleTransformCmd } = require('./utils');

class FilterFlop {
  get name() {
    return 'flop';
  }

  async apply(file, _imageInfo, globals) {
    const cmd = await getSimpleTransformCmd(file, globals, '-flop');
    execCmd(cmd);
  }
}

module.exports = FilterFlop;
