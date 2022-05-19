const BadWords = require('bad-words');

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
    return !this.badWords.isProfane(text);
  }
}

module.exports = ModerationWords;
