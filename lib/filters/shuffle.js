const { transformFrames, execCmd } = require('./utils');
const { shuffle } = require('lodash');

class FilterShuffle {
  constructor({ delay = null } = {}) {
    this.delay = delay;
  }

  get name() {
    return 'shuffle';
  }
  async apply(file) {
    await transformFrames(file, null, false, image => {
      image.frames = shuffle(image.frames);
      return image;
    });
    if (this.delay) {
      execCmd(`convert -delay ${this.delay} "${file}" "${file}"`);
    }
  }
}

module.exports = FilterShuffle;
