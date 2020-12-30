class TaggerWord {
  constructor({ tags }) {
    this.tags = tags;
  }

  get name() {
    return 'word';
  }

  async get(_result, globals) {
    const { word } = globals;
    return word ? this.tags : [];
  }
}

module.exports = TaggerWord;
