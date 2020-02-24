const { exec } = require('shelljs');

class FilterColorize {
  constructor({
    color = 'goldenrod',
    percentage = 0,
    matrix = '1 0 0 0 1 0 0 0 1'
  } = {}) {
    this.color = color;
    this.matrix = matrix;
    this.percentage = percentage;
  }
  get name() {
    return 'colorize';
  }
  async apply(file) {
    const adjustments = `-color-matrix "${this.matrix}" -fill "${this.color}" -colorize ${this.percentage}`;
    const cmd = `convert "${file}" ${adjustments} "${file}"`;
    const result = exec(cmd, { silent: true });
    if (result.code !== 0) {
      console.log(`🐞 Oops: ${result.stderr}\n> ${cmd}`);
    }
  }
}

module.exports = FilterColorize;
