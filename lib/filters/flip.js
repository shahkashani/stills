const { execCmd, getSimpleTransformCmd } = require('./utils');

class FilterFlip {
  get name() {
    return 'flip';
  }

  async apply(file, _imageInfo, globals) {
    const cmd = await getSimpleTransformCmd(file, globals, '-flip');
    execCmd(cmd);
  }
}

module.exports = FilterFlip;
