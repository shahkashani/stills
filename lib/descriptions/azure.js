const { get } = require('lodash');

class DescriptionAzure {
  get name() {
    return 'azure';
  }

  getCaption(captions) {
    return captions.join(' ').replace(/\n/g, ' ');
  }

  async get(_file, globals) {
    let text = get(globals, 'aure.text');
    const { captions } = globals;
    if (!text) {
      if (captions) {
        return `[caption: ${this.getCaption(captions)}]`;
      }
      return null;
    }
    if (captions) {
      text = `${text}, caption: ${this.getCaption(captions)}`;
    }
    return `[${text}]`;
  }
}

module.exports = DescriptionAzure;
