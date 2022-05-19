const BadWords = require('bad-words');

class ModerationWords {
  constructor(
    bannedWords = [],
    cleanWords = ['God', 'fuck', 'fucking', 'damn', 'hell']
  ) {
    this.badWords = new BadWords();
    this.badWords.addWords(...bannedWords);
    this.badWords.removeWords(...cleanWords);
  }

  async validate(text) {
    return !this.badWords.isProfane(text);
  }
}

module.exports = ModerationWords;
