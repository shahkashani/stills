const { transformFrames } = require('./utils');

class FilterStation {
  get name() {
    return 'station';
  }

  transform(base, frame) {
    const buf = Buffer.alloc(base.length);
    for (let j = 0; j < buf.length; j++) {
      buf[j] = (base[j] + frame[j]) / 2;
    }
    return buf;
  }

  async applyFrames(frames) {
    const file = frames.file;
    await transformFrames(file, this.transform, true, (image) => {
      image.frames = image.frames.slice(1);
      return image;
    });
  }
}

module.exports = FilterStation;
