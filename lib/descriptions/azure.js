const { compact, uniq, map } = require('lodash');

class DescriptionAzure {
  get name() {
    return 'azure';
  }

  getCaption(captions) {
    return captions.join(' ').replace(/\n/g, ' ');
  }

  async get(images, globals) {
    const { captions = [], azure: azures = [] } = globals || {};

    const cleanCaptions = compact(
      captions.map((caption) => this.getCaption(caption))
    );
    const cleanText = uniq(
      compact(map(azures, 'text').map((text) => (text && text.length > 0 ? `${text}.` : null)))
    );
    const prefix = images.length > 1 ? `${images.length} images.` : null;

    const parts = compact([
      prefix,
      cleanText.length > 0 ? cleanText.join(' ') : null,
      cleanCaptions.length > 0
        ? `Caption${cleanCaptions.length > 1 ? 's' : ''}: ${cleanCaptions.join(
            ' '
          )}`
        : null
    ]);

    return parts.length > 0 ? `[${parts.join(' ')}]` : null;
  }
}

module.exports = DescriptionAzure;
