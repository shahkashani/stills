const { execCmd, getSimpleTransformCmd } = require('./utils');

class FilterFlip {
  get name() {
    return 'flip';
  }

  async applyFrames(frames) {
    const file = frames.file;
    const cmd = await getSimpleTransformCmd(file, '-flip');
    execCmd(cmd);
  }
}

module.exports = FilterFlip;
