const { get } = require('lodash');

class TaggerAzure {
  constructor({ num = 5 } = {}) {
    this.num = num;
  }

  get name() {
    return 'azure';
  }

  async get(_result, globals) {
    const azureTags = get(globals, 'azure.tags', []);
    return azureTags.slice(0, this.num);
  }
}

module.exports = TaggerAzure;
