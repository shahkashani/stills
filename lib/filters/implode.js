const { execCmd, getLastScene, getFrameRangeCmd } = require('./utils');

class FilterImplode {
  constructor({ rate = 0.6, detectSceneChange = true } = {}) {
    this.rate = rate;
    this.detectSceneChange = detectSceneChange;
  }

  get name() {
    return 'implode';
  }

  async apply(file) {
    let rate = this.rate;
    let implode = `-implode ${rate}`;
    if (this.detectSceneChange) {
      const { start, end } = await getLastScene(file);
      implode = getFrameRangeCmd(start, end, implode);
    }
    execCmd(`convert "${file}" ${implode} "${file}"`);
  }
}

module.exports = FilterImplode;
