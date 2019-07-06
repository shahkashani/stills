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

        image.frames[i].delay = 1;
        image.frames[i + 1].delay = 1;
      }
      return image;
    });
  }
}

module.exports = FilterJitter;
