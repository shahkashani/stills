const { transformFrames } = require('./utils');

class FilterMelt {
  get name() {
    return 'melt';
  }

  transform(base, frame) {
    var buf = Buffer.alloc(base.length);
    for (var j = 0; j < buf.length; j++) {
      buf[j] = Math.min(base[j], frame[j]);
    }
    return buf;
  }

  async apply(file) {
    await transformFrames(file, this.transform);
  }
}

module.exports = FilterMelt;
