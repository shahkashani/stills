const {
  TextAnalyticsClient,
  AzureKeyCredential
} = require('@azure/ai-text-analytics');
const { flattenDeep } = require('lodash');
const removeHighlights = require('../utils/remove-highlights');

class TaggerCaptions {
  constructor({ url, token } = {}) {
    this.client = new TextAnalyticsClient(url, new AzureKeyCredential(token));
  }

  get name() {
    return 'captions';
  }

  async keyPhraseExtraction(input) {
    const keyPhraseResult = await this.client.extractKeyPhrases([input]);
    return keyPhraseResult
      .reduce((memo, document) => [...document.keyPhrases, ...memo], [])
      .map((t) => t.toLowerCase());
  }

  async get(data, useGlyphs) {
    if (useGlyphs) {
      return [];
    }
    const captions = flattenDeep(data.captions).map((c) => removeHighlights(c));
    const string = captions.join(' ').trim();
    if (string.length === 0) {
      return [];
    }
    return await this.keyPhraseExtraction(string);
  }
}

module.exports = TaggerCaptions;
