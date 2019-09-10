const { execCmd, getSimpleTransformCmd } = require('./utils');

class FilterFlip {
  get name() {
    return 'flip';
  }

  async apply(file) {
    const cmd = await getSimpleTransformCmd(file, '-flip');
    execCmd(cmd);
  }
}

module.exports = FilterFlip;
