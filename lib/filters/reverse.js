const { execCmd } = require('./utils');

class FilterReverse {
  get name() {
    return 'reverse';
  }

  async applyFrames(frames) {
    const file = frames.file;
    const cmd = `convert "${file}" -reverse "${file}"`;
    execCmd(cmd);
  }
}

module.exports = FilterReverse;
