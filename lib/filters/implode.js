const {
  execCmd,
  getFrameRange,
  getImageInfo,
  getFrameRangeCmd
} = require('./utils');

class FilterImplode {
  constructor({ rate = 0.6, detectSceneChange = true } = {}) {
    this.rate = rate;
    this.detectSceneChange = detectSceneChange;
  }

  get name() {
    return 'implode';
  }

  async apply(file) {
    const { numFrames } = await getImageInfo(file);
    const { start, end } = await getFrameRange(file, this.detectSceneChange);
    const implode = getFrameRangeCmd(
      start,
      end,
      numFrames,
      `-implode ${this.rate}`
    );
    execCmd(`convert "${file}" ${implode} "${file}"`);
  }
}

module.exports = FilterImplode;
