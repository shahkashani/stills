const { readFileSync } = require('fs');
const { inOrder } = require('../utils');

class CaptionsOrdered {
  constructor({ file, index = null } = {}) {
    this.file = file;
    this.index = index;
  }

  get name() {
    return 'ordered';
  }

  async get() {
    const lines = readFileSync(this.file).toString().trim().split(/\n/);
    const line = inOrder(lines, true, this.index);
    return { captions: line.split('|').map((c) => [c]) };
  }
}

module.exports = CaptionsOrdered;
