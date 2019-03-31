const { transformFrames } = require('./utils');

class FilterStation {
  get name() {
    return 'station';
  }

  transform(base, frame) {
    var buf = Buffer.alloc(base.length);
    for (var j = 0; j < buf.length; j++) {
      buf[j] = (base[j] + frame[j]) / 2;
    }
    return buf;
  }

  async apply(file) {
    await transformFrames(file, this.transform, true);
  }
}

module.exports = FilterStation;
