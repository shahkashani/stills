const { sync } = require('glob');
const { sample } = require('lodash');
const { readFileSync } = require('fs');
const getSrtIndexes = require('./utils/get-srt-indexes');
const getClosestCaption = require('./utils/get-closest-caption');
const matchSentence = require('./utils/match-sentence');

class CaptionsQuotes {
  constructor({
    captionsFolder = './captions/ddd',
    folder = './captions/other/quotes'
  } = {}) {
    this.folder = folder;
    this.captionsFolder = captionsFolder;
  }

  getRandomQuote() {
    const files = sync(`${this.folder}/*.txt`);
    const file = sample(files);
    const lines = readFileSync(file).toString().trim().split(/\n/);
    const line = sample(lines);
    return line;
  }

  async getEpisodeName(episodes) {
    const quote = this.getRandomQuote();
    const caption = getClosestCaption(this.captionsFolder, episodes, quote);
    const { index, name, captions, match } = caption;
    console.log(`📒 ${quote}`);
    const [start, end] = getSrtIndexes(captions, 3, 10, index - 1);
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

module.exports = CaptionsQuotes;
