const {
  execCmd,
  getFrameRange,
  getImageInfo,
  getFrameRangeCmd
} = require('./utils');

class FilterReverse {
  constructor({ detectSceneChange = true } = {}) {
    this.detectSceneChange = detectSceneChange;
  }

  get name() {
    return 'reverse';
  }

  async apply(file) {
    const { numFrames } = await getImageInfo(file);
    const { start, end } = await getFrameRange(file, this.detectSceneChange);
    const implode = getFrameRangeCmd(start, end, numFrames, `-reverse`);
    execCmd(`convert "${file}" ${implode} "${file}"`);
  }
}

module.exports = FilterReverse;
