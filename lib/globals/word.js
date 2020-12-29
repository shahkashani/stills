class GlobalsWord {
  constructor({ word }) {
    this.word = word;
  }

  get name() {
    return 'word';
  }

  async get() {
    return this.word;
  }
}

module.exports = GlobalsWord;
