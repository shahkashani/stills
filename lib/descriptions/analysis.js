const { map, compact } = require('lodash');

class DescriptionAnalysis {
  get name() {
    return 'analysis';
  }

  getCaption(captions) {
    return captions.join(' ').replace(/\n/g, ' ').trim();
  }

  getImageType(image) {
    return image.endsWith('gif') ? 'GIF' : 'Image';
  }

  async get(images, results) {
    const { captions: rawCaptions = [], analysis = [] } = results || {};
    const captions = rawCaptions.map((caption) => this.getCaption(caption));
    const descriptions = map(analysis, 'text');

    return compact(
      images.map((image, i) => {
        const parts = [];
        const type = this.getImageType(image.filename);
        const description = descriptions[i];
        const hasDescription = description && description.length > 0;
        const caption = captions[i];
        const captionPreText = hasDescription ? '' : ' caption';
        const captionPostText = hasDescription ? 'Caption: ' : '';
        const prefix =
          images.length > 1
            ? `${type}${captionPreText} ${i + 1}: `
            : `${type}${captionPreText}: `;
        if (hasDescription) {
          parts.push(`${descriptions[i]}.`);
        }
        if (caption && caption.length > 0) {
          parts.push(`${captionPostText}${caption}`);
        }
        return parts.length > 0 ? `[${prefix}${parts.join(' ')}]` : null;
      })
    ).join('\n\n');
  }
}

module.exports = DescriptionAnalysis;
