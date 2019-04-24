const { execCmd, getProgressiveCmd, getImageInfo } = require('./utils');

class FilterImplode {
  constructor({ rate = 0.6, isProgressive = false } = {}) {
    this.rate = rate;
    this.isProgressive = isProgressive;
  }

  get name() {
    return 'implode';
  }

  async apply(file) {
    const { numFrames } = getImageInfo(file);
    const implode = this.isProgressive
      ? getProgressiveCmd(
          progress => `-implode ${this.rate * progress}`,
          numFrames
        )
      : `-implode ${this.rate}`;
    execCmd(`convert "${file}" ${implode} "${file}"`);
  }
}

module.exports = FilterImplode;
