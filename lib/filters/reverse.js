const { exec } = require('shelljs');

class FilterReverse {
  get name() {
    return 'reverse';
  }

  async apply(file) {
    const cmd = `convert "${file}" -coalesce -reverse "${file}"`;
    const result = exec(cmd, { silent: true });
    if (result.code !== 0) {
      console.log(`🐞 Oops: ${result.stderr}\n> ${cmd}`);
    }
  }
}

module.exports = FilterReverse;
