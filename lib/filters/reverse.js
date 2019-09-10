const { execCmd, getSimpleTransformCmd } = require('./utils');

class FilterReverse {
  get name() {
    return 'reverse';
  }

  async apply(file) {
    const cmd = await getSimpleTransformCmd(file, '-reverse');
    execCmd(cmd);
  }
}

module.exports = FilterReverse;
