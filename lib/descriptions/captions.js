const textToGlyphs = require('../utils/text-to-glyphs');

class DescriptionCaptions {
  get name() {
    return 'captions';
  }

  getCaption(captions, useGlyphs) {
    return captions
      .map((c) => textToGlyphs(c, useGlyphs))
      .join(' ')
      .replace(/\n/g, ' ')
      .trim();
  }

  async get(images, results, useGlyphs) {
    const { captions: rawCaptions = [] } = results || {};
    if (rawCaptions.length === 0) {
      return '';
    }
    const captions = rawCaptions.map((_caption, index) =>
      this.getCaption(rawCaptions[index], useGlyphs)
    );
    const description = captions.join(' ');
    return description.length === 0 ? '' : `[${description}]`;
  }
}

module.exports = DescriptionCaptions;
