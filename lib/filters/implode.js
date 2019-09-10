const { execCmd, getSimpleTransformCmd } = require('./utils');

class FilterImplode {
  constructor({ rate = 0.6 } = {}) {
    this.rate = rate;
  }

  get name() {
    return 'implode';
  }

  async apply(file) {
    const subCmd = `-implode ${this.rate}`;
    const cmd = await getSimpleTransformCmd(file, subCmd);
    execCmd(cmd);
  }
}

module.exports = FilterImplode;
