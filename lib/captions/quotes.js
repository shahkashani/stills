const { sync } = require('glob');
const { sample } = require('lodash');
const { readFileSync } = require('fs');

const CaptionsDropin = require('./base/dropin');

class CaptionsQuotes extends CaptionsDropin {
  constructor(options = {}) {
    super(options);
    const { folder = './captions/other/quotes' } = options;
    this.folder = folder;
  }

  get name() {
    return 'quotes';
  }

  async getText() {
    const files = sync(`${this.folder}/**/*.txt`);
    const file = sample(files);
    const lines = readFileSync(file).toString().trim().split(/\n/);
    const line = sample(lines);
    return line;
  }
}

module.exports = CaptionsQuotes;
