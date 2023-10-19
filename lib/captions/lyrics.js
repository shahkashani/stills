const getLyrics = require('./utils/get-lyrics');
const { sample } = require('lodash');
const getTextBlocks = require('./utils/get-text-blocks');
const fixSentence = require('./utils/fix-sentence');

class CaptionsLyrics {
  constructor({ artist, apikey, bannedWords = [], num } = {}) {
    this.artist = artist;
    this.apikey = apikey;
    this.bannedWords = bannedWords;
    this.num = num;
  }

  get name() {
    return 'lyrics';
  }

  async get() {
    const lyrics = await getLyrics(this.artist, { apikey: this.apikey });
    const blocks = getTextBlocks(lyrics);
    console.log(blocks);
    const block = sample(blocks).map((line) => fixSentence(line));
    console.log(`🎤 Choosing`, block);
    return { captions: block };
  }
}

module.exports = CaptionsLyrics;
