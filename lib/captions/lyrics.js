const getLyrics = require('./utils/get-lyrics');
const { sample } = require('lodash');
const getTextBlocks = require('./utils/get-text-blocks');
const fixSentence = require('./utils/fix-sentence');
const CaptionsDropin = require('./base/dropin');

class CaptionsLyrics extends CaptionsDropin {
  constructor(options) {
    super(options);
    this.artist = options.artist;
    this.apikey = options.apikey;
    this.bannedWords = options.bannedWords;
    this.num = options.num;
  }

  get name() {
    return 'lyrics';
  }

  async getText() {
    const lyrics = await getLyrics(this.artist, { apikey: this.apikey });
    const blocks = getTextBlocks(lyrics, 1);

    const filteredBlocks = blocks.filter((block) => block.length < this.num);
    const useBlocks = filteredBlocks.length > 0 ? filteredBlocks : blocks;

    console.log(useBlocks);

    const block = sample(useBlocks).map((line) => fixSentence(line));
    console.log(`🎤 Choosing`, block);
    return block;
  }
}

module.exports = CaptionsLyrics;
