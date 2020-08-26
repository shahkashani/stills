const { get, uniq } = require('lodash');

class TaggerAzure {
  constructor({ num = 5 } = {}) {
    this.num = num;
  }

  get name() {
    return 'azure';
  }

  async get(_result, globals) {
    const azures = get(globals, 'azure', []);
    return uniq(
      azures.reduce((memo, { tags = [] }) => {
        return [...memo, ...tags.slice(0, this.num)];
      }, [])
    );
  }
}

module.exports = TaggerAzure;
