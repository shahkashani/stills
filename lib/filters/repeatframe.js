const { transformFrames, execCmd } = require('./utils');

class FilterRepeatFrame {
  constructor({ delay = null } = {}) {
    this.delay = delay;
  }

  get name() {
    return 'repeatframe';
  }

  async apply(file) {
    await transformFrames(file, null, false, (image) => {
      for (let i = 0; i < image.frames.length - 1; i += 2) {
        image.frames[i] = image.frames[0];
      }
      return image;
    });
    if (this.delay) {
      execCmd(`convert -delay ${this.delay} "${file}" "${file}"`);
    }
  }
}

module.exports = FilterRepeatFrame;
