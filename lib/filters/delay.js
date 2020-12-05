const { execCmd } = require('./utils');

class FilterDelay {
  constructor({ delay = null } = {}) {
    this.delay = delay;
  }

  get name() {
    return 'delay';
  }

  async apply(file) {
    execCmd(`convert -delay ${this.delay/10} "${file}" "${file}"`);
  }
}

module.exports = FilterDelay;
