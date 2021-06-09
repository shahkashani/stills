class DescriptionCaptions {
  get name() {
    return 'captions';
  }

  getCaption(captions) {
    return captions.join(' ').replace(/\n/g, ' ').trim();
  }

  async get(images, results) {
    const { captions: rawCaptions = [] } = results || {};
    if (rawCaptions.length === 0) {
      return '';
    }
    const captions = rawCaptions.map((caption) => this.getCaption(caption));
    return captions.join(' ');
  }
}

module.exports = DescriptionCaptions;
