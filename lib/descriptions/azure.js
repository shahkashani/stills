const { compact } = require('lodash');

class DescriptionAzure {
  get name() {
    return 'azure';
  }

  getCaption(captions) {
    return captions.join(' ').replace(/\n/g, ' ');
  }

  async get(images, globals) {
    const { captions = [], azure: azures = [] } = globals || {};

    const texts = compact(
      images.map((_image, index) => {
        const caption = captions[index] || [];
        const text = azures[index] ? azures[index].text : null;
        const prefix = images.length > 1 ? `Image ${index + 1}` : null;
        if (!text) {
          return caption.length > 0
            ? `${prefix ? `${prefix} ` : ''}caption: ${this.getCaption(
                caption
              )}`
            : null;
        }
        if (caption.length > 0) {
          return `${
            prefix ? `${prefix}: ` : ''
          }${text}, caption: ${this.getCaption(caption)}`;
        }
        return `${prefix ? `${prefix}: ` : ''}${text}`;
      })
    );
    if (texts.length === 0) {
      return;
    }

    const wrappedTexts = texts.map((text) => `[${text}]`);
    return wrappedTexts.join('\n');
  }
}

module.exports = DescriptionAzure;
