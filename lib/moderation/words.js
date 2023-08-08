const BadWords = require('bad-words');
const { flatten } = require('lodash');

class ModerationWords {
  constructor({ bannedWords = [], allowedWords = [] }) {
    this.badWords = new BadWords();
    if (bannedWords.length > 0) {
      this.badWords.addWords(...bannedWords);
    }
    if (allowedWords.length > 0) {
      this.badWords.removeWords(...allowedWords);
    }
  }

  async validate(text) {
    const useText = Array.isArray(text) ? flatten(text).join(' ') : text;
    return !this.badWords.isProfane(useText);
  }
}

module.exports = ModerationWords;
