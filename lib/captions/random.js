const { readFileSync } = require('fs');
const { sample } = require('lodash');

class CaptionsRandom {
  constructor({ file } = {}) {
    this.file = file;
  }

  get name() {
    return 'random';
  }

  async get() {
    const lines = readFileSync(this.file).toString().trim().split(/\n/);
    const line = sample(lines);
    return { captions: line.split('|').map((c) => [c]) };
  }
}

module.exports = CaptionsRandom;
