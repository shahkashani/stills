const { flatten } = require('lodash');
const textToGlyphs = require('../utils/text-to-glyphs');

class DescriptionCaptions {
  get name() {
    return 'captions';
  }

  async get(_images, results, useGlyphs) {
    const { captions = [] } = results || {};
    if (captions.length === 0) {
      return '';
    }
    const description = flatten(captions)
      .map((caption) => textToGlyphs(caption, useGlyphs))
      .join(' ');
    return description.trim().length === 0 ? '' : `[${description}]`;
  }
}

module.exports = DescriptionCaptions;
