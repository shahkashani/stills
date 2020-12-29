class TaggerWord {
  get name() {
    return 'word';
  }

  async get(_result, globals) {
    const { word } = globals;
    return word ? ['et in arcadia ego'] : [];
  }
}

module.exports = TaggerWord;
