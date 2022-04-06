const {
  TextAnalyticsClient,
  AzureKeyCredential
} = require('@azure/ai-text-analytics');
const { flattenDeep } = require('lodash');

class TaggerCaptionsCognitive {
  constructor({ url, token } = {}) {
    this.client = new TextAnalyticsClient(url, new AzureKeyCredential(token));
  }

  get name() {
    return 'captions-cognitive';
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
    const captions = flattenDeep(data.captions);
    const string = captions.join(' ').trim();
    if (string.length === 0) {
      return [];
    }
    return await this.keyPhraseExtraction(string);
  }
}

module.exports = TaggerCaptionsCognitive;
