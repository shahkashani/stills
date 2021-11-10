const { execCmd } = require('./utils');

class FilterColorTone {
  constructor({ color = 'maroon', opacity = 0.5, isNegate = false } = {}) {
    this.color = color;
    this.opacity = opacity;
    this.isNegate = isNegate;
  }

  get name() {
    return 'colortone';
  }

  async applyFrame(frame) {
    const file = frame.file;
    const negate = this.isNegate ? '-negate' : '';
    const cmd = `convert "${file}" \\( -clone 0 -fill '${
      this.color
    }' -colorize 100% \\) \\( -clone 0 -colorspace gray ${negate} \\) -compose blend -define compose:args=${
      this.opacity
    },${1 - this.opacity} -composite "${file}"`;
    execCmd(cmd);
  }
}

module.exports = FilterColorTone;
