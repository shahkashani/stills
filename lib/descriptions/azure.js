const { map, compact } = require('lodash');

class DescriptionAzure {
  get name() {
    return 'azure';
  }

  getCaption(captions) {
    return captions.join(' ').replace(/\n/g, ' ').trim();
  }

  getImageType(image) {
    return image.endsWith('gif') ? 'GIF' : 'Image';
  }

  async get(images, globals) {
    const { captions: rawCaptions = [], azure: azures = [] } = globals || {};
    const captions = rawCaptions.map((caption) => this.getCaption(caption));
    const descriptions = map(azures, 'text');

    return compact(
      images.map((image, i) => {
        const parts = [];
        const type = this.getImageType(image);
        const description = descriptions[i];
        const caption = captions[i];
        const prefix = images.length > 0 ? `${type} ${i + 1}: ` : '';
        if (description && description.length > 0) {
          parts.push(`${descriptions[i]}.`);
        }
        if (caption && caption.length > 0) {
          parts.push(`Caption: ${caption}`);
        }
        return parts.length > 0 ? `[${prefix}${parts.join(' ')}]` : null;
      })
    ).join('\n\n');
  }
}

module.exports = DescriptionAzure;
