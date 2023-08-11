const { replaceProfanities } = require('no-profanity');
const { uniq, compact } = require('lodash');
const rake = require('rake-js').default;

class TaggerCaptions {
  get name() {
    return 'captions';
  }

  cleanText(text) {
    try {
      return replaceProfanities(
        (text || '').replace(/[\[\]\(\)]/g, '')
      ).replace(/[?!,.]$/, '');
    } catch (err) {
      return text;
    }
  }

  tagsFromCaptionsArray(captions) {
    return captions.reduce((memo, caption) => {
      const cleanCaption = caption.replace(/\*/g, '').toLowerCase();
      const keywords = rake(`${cleanCaption}.`);
      const tags = compact(
        keywords.map((tag) => this.cleanText(tag.replace(/\*/g, '').trim()))
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
