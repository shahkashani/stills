class TaggerStatic {
  constructor({ tags }) {
    this.tags = tags;
  }

  get name() {
    return 'source';
  }

  async get() {
    return this.tags;
  }
}

module.exports = TaggerStatic;
