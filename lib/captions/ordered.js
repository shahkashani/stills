const { readFileSync } = require('fs');
const { inOrder } = require('../utils');

class CaptionsOrdered {
  constructor({ file }) {
    this.file = file;
  }

  get name() {
    return 'ordered';
  }

  async get() {
    const lines = readFileSync(this.file).toString().trim().split(/\n/);
    const line = inOrder(lines, true);
    return { captions: line.split('|').map((c) => [c]) };
  }
}

module.exports = CaptionsOrdered;
