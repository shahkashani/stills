const { get } = require('lodash');

class DescriptionAzure {
  get name() {
    return 'azure';
  }

  getCaption(captions) {
    return captions.join(' ').replace(/\n/g, ' ');
  }

  async get(_file, globals) {
    let text = get(globals, 'azure.text');
    if (!text) {
      return null;
    }
    const { captions } = globals;
    if (captions) {
      text = `${text}, caption: ${this.getCaption(captions)}`;
    }
    return `[${text}]`;
  }
}

module.exports = DescriptionAzure;
