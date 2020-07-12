const { execCmd } = require('./utils');

class FilterReverse {
  get name() {
    return 'reverse';
  }

  async apply(file) {
    const cmd = `convert "${file}" -reverse "${file}"`;
    execCmd(cmd);
  }
}

module.exports = FilterReverse;
