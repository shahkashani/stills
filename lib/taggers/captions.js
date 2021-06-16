const nlp = require('compromise');
const filter = new (require('bad-words'))();
const { uniq, compact } = require('lodash');

class TaggerCaptions {
  get name() {
    return 'captions';
  }

  cleanText(text) {
    try {
      return filter
        .clean((text || '').replace(/[\[\]\(\)]/g, ''))
        .replace(/[?!,.]$/, '');
    } catch (err) {
      return text;
    }
  }

  tagsFromCaptionsArray(captions) {
    const mapFn = (word) =>
      word.normal || word.clean || word.reduced || word.text;
    return captions.reduce((memo, caption) => {
      const cleanCaption = caption.replace(/\*/g, '');
      const doc = nlp(this.cleanText(cleanCaption));
      const tags = compact(
        [
          ...doc.nouns().termList().map(mapFn),
          ...doc.adjectives().termList().map(mapFn)
        ].map((tag) => this.cleanText(tag.replace(/\*/g, '').trim()))
      );
      return [...memo, ...tags];
    }, []);
  }
  async get(data) {
    const { captions = [] } = data;
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
