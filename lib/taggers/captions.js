const { get } = require('lodash');
const nlp = require('compromise');
const filter = new (require('bad-words'))();
const { map, uniq } = require('lodash');

class TaggerCaptions {
  get name() {
    return 'captions';
  }

  cleanText(text) {
    return filter.clean(text.replace(/[[]()]/g, ''));
  }

  async get(result) {
    const captions = get(result, 'filters.captions', []);
    if (captions.length === 0) {
      return [];
    }
    return uniq(
      captions.reduce((memo, caption) => {
        const doc = nlp(this.cleanText(caption)).normalize();
        const tags = [
          ...map(doc.nouns().data(), 'normal'),
          ...map(doc.adjectives().data(), 'normal')
        ];
        return [...memo, ...tags];
      }, [])
    );
  }
}

module.exports = TaggerCaptions;
