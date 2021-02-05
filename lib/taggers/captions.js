const nlp = require('compromise');
const filter = new (require('bad-words'))();
const { map, uniq } = require('lodash');

class TaggerCaptions {
  get name() {
    return 'captions';
  }

  cleanText(text) {
    try {
      return filter.clean((text || '').replace(/[\[\]\(\)]/g, ''));
    } catch (err) {
      return text;
    }
  }

  tagsFromCaptionsArray(captions) {
    return captions.reduce((memo, caption) => {
      const cleanCaption = caption.replace(/\*/g, '');
      const doc = nlp(this.cleanText(cleanCaption)).normalize();
      const tags = [
        ...map(doc.nouns().data(), 'normal'),
        ...map(doc.adjectives().data(), 'normal')
      ].filter((tag) => !tag.match(/^\*+$/));
      return [...memo, ...tags];
    }, []);
  }

  async get(_result, globals) {
    const { captions = [] } = globals;
    if (captions.length === 0) {
      return [];
    }
    return uniq(
      captions.reduce((memo, c) => {
        return [...memo, ...this.tagsFromCaptionsArray(c)];
      }, [])
    );
  }
}

module.exports = TaggerCaptions;
