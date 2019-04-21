const { compact } = require('lodash');

class TaggerFilters {
  constructor(tagMap = {}) {
    this.tagMap = tagMap;
  }

  get name() {
    return 'filters';
  }

  async get(result) {
    return compact(
      Object.keys(result.filters).map(filterName => this.tagMap[filterName])
    );
  }
}

module.exports = TaggerFilters;
