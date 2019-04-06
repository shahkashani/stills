const { transformFrames } = require('./utils');
const { shuffle } = require('lodash');

class FilterShuffle {
  get name() {
    return 'shuffle';
  }
  async apply(file) {
    await transformFrames(file, null, false, image => {
      image.frames = shuffle(image.frames);
      return image;
    });
  }
}

module.exports = FilterShuffle;
