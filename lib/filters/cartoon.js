const { execCmd } = require('./utils');

class FilterCartoon {
  constructor({
    edge = '-canny 0x1+5%+10%',
  } = {}) {
    this.edge = edge;
  }

  get name() {
    return 'cartoon';
  }

  async applyFrame(frame) {
    const file = frame.file;
    execCmd(`convert "${file}" \\( +clone ${this.edge} -matte -channel A +level 0,50% \\) -composite -type grayscale -brightness-contrast 15x35 -negate "${file}"`);
  }
}

module.exports = FilterCartoon;
