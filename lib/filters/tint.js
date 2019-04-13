const { transformFrames } = require('./utils');

class FilterTint {
  constructor({ factor = 2 } = {}) {
    this.factor = factor;
  }

  get name() {
    return 'tint';
  }

  transform(base, frame, numFrame, numFrames) {
    const buf = Buffer.alloc(base.length);
    const progress = numFrame / numFrames;
    const multiplier = 1 + (this.factor - 1) * progress;
    for (let j = 0; j < buf.length; j += 4) {
      buf[j] = Math.min(255, frame[j] * multiplier);
      buf[j + 1] = frame[j + 1];
      buf[j + 2] = frame[j + 2];
      buf[j + 3] = frame[j + 3];
    }
    return buf;
  }

  async apply(file) {
    await transformFrames(file, (...args) => this.transform(...args));
  }
}

module.exports = FilterTint;
