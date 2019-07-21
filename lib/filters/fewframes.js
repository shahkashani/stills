const { transformFrames } = require('./utils');

class FilterFewFrames {
  constructor({ frames = 2 } = {}) {
    this.frames = frames;
  }

  get name() {
    return 'fewframes';
  }

  async apply(file) {
    await transformFrames(file, null, false, image => {
      for (let i = 0; i < image.frames.length; i++) {
        image.frames[i] = image.frames[i % this.frames];
        image.frames[i].delay = 1;
      }
      return image;
    });
  }
}

module.exports = FilterFewFrames;
