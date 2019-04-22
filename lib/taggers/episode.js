const { get } = require('lodash');
class TaggerEpisode {
  get name() {
    return 'episode';
  }

  async get(result) {
    const episodeName = get(result, 'source.output', '');
    const tag = episodeName.toLowerCase();
    return tag ? [tag] : [];
  }
}

module.exports = TaggerEpisode;
