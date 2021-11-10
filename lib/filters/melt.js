const { transformFrames } = require('./utils');

class FilterMelt {
  get name() {
    return 'melt';
  }

  transform(base, frame) {
    const buf = Buffer.alloc(base.length);
    for (let j = 0; j < buf.length; j++) {
      buf[j] = Math.min(base[j], frame[j]);
    }
    return buf;
  }

  async applyFrames(frames) {
    const file = frames.file;
    await transformFrames(file, this.transform);
  }
}

module.exports = FilterMelt;
