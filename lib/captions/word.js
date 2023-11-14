const CaptionsDropin = require('./base/dropin');
const randomWord = require('random-word');
const fixSentence = require('./utils/fix-sentence');

class CaptionsWord extends CaptionsDropin {
  get name() {
    return 'word';
  }

  async getText() {
    return fixSentence(randomWord());
  }
}

module.exports = CaptionsWord;
