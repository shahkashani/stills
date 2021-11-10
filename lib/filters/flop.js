const { execCmd, getSimpleTransformCmd } = require('./utils');

class FilterFlop {
  get name() {
    return 'flop';
  }

  async applyFrames(frames) {
    const file = frames.file;
    const cmd = await getSimpleTransformCmd(file, '-flop');
    execCmd(cmd);
  }
}

module.exports = FilterFlop;
