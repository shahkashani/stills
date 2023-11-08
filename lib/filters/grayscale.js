const sharp = require('../utils/sharp');

class FilterGrayscale {
  get name() {
    return 'grayscale';
  }

  async applyFrame(frame) {
    frame.buffer = await sharp(frame.buffer).greyscale().toBuffer();
  }
}

module.exports = FilterGrayscale;
