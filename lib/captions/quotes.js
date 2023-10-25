const { sync } = require('glob');
const { sample } = require('lodash');
const { readFileSync } = require('fs');
const fixSentence = require('../captions/utils/fix-sentence');

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
    return fixSentence(line);
  }
}

module.exports = CaptionsQuotes;
