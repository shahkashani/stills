const { transformFrames } = require('./utils');

class FilterBlendSelf {
  get name() {
    return 'blendself';
  }

  transform(base, frame, count, total, image) {
    const buf = Buffer.alloc(base.length);
    const avgFrame = image.frames[total-count-1]; 
    for (let j = 0; j < buf.length; j++) {
      buf[j] = (avgFrame.data[j] + frame[j]) / 2;
    }
    return buf;
  }

  async apply(file) {
    await transformFrames(file, this.transform, true, image => {
      image.frames = image.frames.slice(1);
      return image;
    });
  }
}

module.exports = FilterBlendSelf;
