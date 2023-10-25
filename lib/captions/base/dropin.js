const CaptionFinder = require('../utils/caption-finder');

class CaptionsDropin {
  constructor({ captionsFolder = './captions/ddd', num } = {}) {
    this.captionsFolder = captionsFolder;
    this.num = num;
  }

  async getMatch() {
    return null;
  }

  async getText() {
    return [];
  }

  async getEpisodeName(episodes) {
    const cm = new CaptionFinder({
      folder: this.captionsFolder,
      episodes,
      randomize: 5
    });
    const matchText = await this.getMatch();
    const captions = await this.getText();
    this.result = cm.find(captions, this.num, matchText);
    console.log(`🏹 Closest match`, { matchText, ...this.result });
    console.log('?', this.result.name);
    return this.result.name;
  }

  async get() {
    return this.result;
  }
}

module.exports = CaptionsDropin;
