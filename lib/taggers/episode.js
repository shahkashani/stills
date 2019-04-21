const { get } = require('lodash');
class TaggerEpisode {
  get name() {
    return 'episode';
  }

  async get(result) {
    const episodeName = get(result, 'source.output');
    return episodeName ? [episodeName] : [];
  }
}

module.exports = TaggerEpisode;
