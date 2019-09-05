const { execCmd, getSimpleTransformCmd } = require('./utils');

class FilterImplode {
  constructor({ rate = 0.6 } = {}) {
    this.rate = rate;
  }

  get name() {
    return 'implode';
  }

  async apply(file, _imageInfo, globals) {
    const subCmd = `-implode ${this.rate}`;
    const cmd = await getSimpleTransformCmd(file, globals, subCmd);
    execCmd(cmd);
  }
}

module.exports = FilterImplode;
