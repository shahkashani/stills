class DescriptionStatic {
  constructor({ description } = {}) {
    this.description = description;
  }

  get name() {
    return 'static';
  }

  async get() {
    return this.description;
  }
}

module.exports = DescriptionStatic;
