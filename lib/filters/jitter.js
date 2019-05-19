const { transformFrames } = require('./utils');

class FilterJitter {
  get name() {
    return 'jitter';
  }

  async apply(file) {
    await transformFrames(file, null, false, image => {
      for (let i = 0; i < image.frames.length - 1; i += 2) {
        const current = image.frames[i];
        image.frames[i] = image.frames[i + 1];
        image.frames[i + 1] = current;
      }
      return image;
    });
  }
}

module.exports = FilterJitter;
