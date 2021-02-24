const { transformFrames } = require('./utils');
const tinycolor = require('tinycolor2');

class FilterFlash {
  get name() {
    return 'flash';
  }

  brighten(frame) {
    const buf = Buffer.alloc(frame.length);
    for (let i = 0; i < buf.length; i += 4) {
      const brighter = tinycolor({
        r: frame[i],
        g: frame[i + 1],
        b: frame[i + 2],
        a: frame[i + 3]
      })
        .brighten(70)
        .toRgb();
      buf[i] = brighter.r;
      buf[i + 1] = brighter.g;
      buf[i + 2] = brighter.b;
      buf[i + 3] = brighter.a;
    }
    return buf;
  }

  transform(base, frame) {
    return Math.random() > 0.1 ? frame : this.brighten(frame);
  }

  async apply(file) {
    await transformFrames(file, (...args) => this.transform(...args));
  }
}

module.exports = FilterFlash;
