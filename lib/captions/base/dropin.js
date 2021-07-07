const { sample } = require('lodash');
const getSrtIndexes = require('../utils/get-srt-indexes');
const getClosestCaption = require('../utils/get-closest-caption');
const matchSentence = require('../utils/match-sentence')();
const fixSentence = require('../utils/fix-sentence');

class CaptionsDropin {
  constructor({ captionsFolder = './captions/ddd', num = 3 } = {}) {
    this.captionsFolder = captionsFolder;
    this.num = num;
  }

  async getText() {
    return '';
  }

  async getEpisodeName(episodes) {
    const quote = await this.getText();
    const caption = sample(
      getClosestCaption(this.captionsFolder, episodes, quote, 5)
    );
    const { index, name, captions, match } = caption;
    console.log(`📒 ${quote}`);

    if (this.num === 1) {
      this.result = {
        captions: [[fixSentence(quote)]],
        timestamps: [match.start]
      };
      return name;
    }
    const srtStart = index - Math.floor(this.num / 2);
    const [start, end] = getSrtIndexes(captions, this.num, 10, srtStart);

    console.log(`🏹 ${match.text}`);

    captions[index].text = matchSentence(quote, match.text);
    const group = captions.slice(start, end + 1);
    this.result = {
      captions: group.map(({ text }) => [text]),
      timestamps: group.map(({ start, end }) => start + (end - start) / 2)
    };
    return name;
  }

  async get() {
    return this.result;
  }
}

module.exports = CaptionsDropin;
