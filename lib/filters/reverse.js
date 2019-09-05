const { execCmd, getSimpleTransformCmd } = require('./utils');

class FilterReverse {
  get name() {
    return 'reverse';
  }

  async apply(file, _imageInfo, globals) {
    const cmd = await getSimpleTransformCmd(file, globals, '-reverse');
    execCmd(cmd);
  }
}

module.exports = FilterReverse;
