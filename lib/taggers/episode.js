const { get } = require('lodash');
const { parse } = require('path');

class TaggerEpisode {
  get name() {
    return 'episode';
  }

  async get(result) {
    const fileName = get(result, 'source.output', '');
    const { name: episodeName } = parse(fileName);
    const tag = episodeName.toLowerCase();
    return tag ? [tag] : [];
  }
}

module.exports = TaggerEpisode;
