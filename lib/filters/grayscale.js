const { exec } = require('../effects');

class FilterGrayscale {
  constructor({} = {}) {}

  get name() {
    return 'grayscale';
  }

  async applyFrame(frame) {
    await exec(
      frame,
      '\\( +clone +level-colors GREY50 -attenuate 6 +noise Poisson -colorspace Gray \\) -compose Overlay -composite -modulate 100,0,100'
    );
  }
}

module.exports = FilterGrayscale;
