const sharp = require('../utils/sharp');

class FilterGrayscale {
  constructor({ contrast = 1, brightness = 1 } = {}) {
    this.contrast = contrast;
    this.brightness = brightness;
  }
  get name() {
    return 'grayscale';
  }

  async applyFrame(frame) {
    if (this.contrast !== 1 || this.brightness !== 1) {
      frame.buffer = await sharp(frame.buffer)
        .linear(this.contrast, -(128 * this.contrast) + 128)
        .modulate({ brightness: this.brightness })
        .greyscale()
        .toBuffer();
    } else {
      frame.buffer = await sharp(frame.buffer).greyscale().toBuffer();
    }
  }
}

module.exports = FilterGrayscale;
