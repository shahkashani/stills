const { exec } = require('shelljs');

class FilterGray {
  constructor({ brightnessContrast = '5x20', attenuate = 1 } = {}) {
    this.brightnessContrast = brightnessContrast;
    this.attenuate = attenuate;
  }
  get name() {
    return 'gray';
  }
  async apply(file) {
    const adjustments = `-attenuate ${
      this.attenuate
    } +noise gaussian -colorspace gray -brightness-contrast ${
      this.brightnessContrast
    } -layers Optimize`;
    const cmd = `convert "${file}" ${adjustments} "${file}"`;
    const result = exec(cmd, { silent: true });
    if (result.code !== 0) {
      console.log(`🐞 Oops: ${result.stderr}\n> ${cmd}`);
    }
  }
}

module.exports = FilterGray;
