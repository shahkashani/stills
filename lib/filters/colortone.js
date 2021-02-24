const { execCmd, processAsStills } = require('./utils');

class FilterColorTone {
  constructor({ color = 'maroon', opacity = 0.5, isNegate = false } = {}) {
    this.color = color;
    this.opacity = opacity;
    this.isNegate = isNegate;
  }

  get name() {
    return 'colortone';
  }

  async apply(file) {
    await processAsStills(file, async (png) => {
      const negate = this.isNegate ? '-negate' : '';
      const cmd = `convert "${png}" \\( -clone 0 -fill '${
        this.color
      }' -colorize 100% \\) \\( -clone 0 -colorspace gray ${negate} \\) -compose blend -define compose:args=${
        this.opacity
      },${1 - this.opacity} -composite "${png}"`;
      execCmd(cmd);
    });
  }
}

module.exports = FilterColorTone;
