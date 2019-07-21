const { transformFrames, execCmd } = require('./utils');

class FilterFewFrames {
  constructor({ frames = 2, delay = '1x30' } = {}) {
    this.frames = frames;
    this.delay = delay;
  }

  get name() {
    return 'fewframes';
  }

  async apply(file) {
    await transformFrames(file, null, false, image => {
      image.frames = image.frames.slice(0, this.frames);
      return image;
    });
    execCmd(`convert -delay ${this.delay} "${file}" "${file}"`);
  }
}

module.exports = FilterFewFrames;
