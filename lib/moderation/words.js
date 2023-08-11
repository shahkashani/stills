const { isProfane } = require('no-profanity');
const { flatten } = require('lodash');

class ModerationWords {
  includes = [];
  excludes = [];

  constructor({ bannedWords = [], allowedWords = [] }) {
    if (bannedWords.length > 0) {
      this.includes = [...bannedWords, ...this.includes];
    }
    if (allowedWords.length > 0) {
      this.excludes = [...allowedWords, ...this.excludes];
    }
  }

  async validate(text) {
    const useText = Array.isArray(text) ? flatten(text).join(' ') : text;
    return !isProfane({
      testString: useText,
      options: { includes: this.includes, excludes: this.excludes }
    });
  }
}

module.exports = ModerationWords;
