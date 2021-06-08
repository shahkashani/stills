const { get, uniq } = require('lodash');

class TaggerAnalysis {
  constructor({ num = 5 } = {}) {
    this.num = num;
  }

  get name() {
    return 'analysis';
  }

  async get(results) {
    const analysis = get(results, 'analysis', []);
    return uniq(
      analysis.reduce((memo, { tags = [] }) => {
        return [...memo, ...tags.slice(0, this.num)];
      }, [])
    );
  }
}

module.exports = TaggerAnalysis;
