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

  async getEpisodeName(episodes, { redis }) {
    const cm = new CaptionFinder({
      redis,
      episodes,
      randomize: 5,
      folder: this.captionsFolder
    });
    const matchText = await this.getMatch();
    const captions = await this.getText();
    this.result = await cm.find(captions, this.num, matchText);
    return { matchText, ...this.result };
  }

  async get() {
    return this.result;
  }
}

module.exports = CaptionsDropin;
