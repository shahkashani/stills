const { transformFrames } = require('./utils');

class FilterInvert {
  get name() {
    return 'invert';
  }

  transform(base, frame, numFrame, numFrames) {
    const buf = Buffer.alloc(base.length);
    const progress = numFrame / numFrames;
    const factor = 255 * progress;
    for (let j = 0; j < buf.length; j += 4) {
      buf[j] = Math.abs(factor - frame[j]);
      buf[j + 1] = Math.abs(factor - frame[j + 1]);
      buf[j + 2] = Math.abs(factor - frame[j + 2]);
      buf[j + 3] = frame[j + 3];
    }
    return buf;
  }

  async apply(file) {
    await transformFrames(file, (...args) => this.transform(...args));
  }
}

module.exports = FilterInvert;
