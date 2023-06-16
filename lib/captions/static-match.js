const { sample } = require('lodash');

class CaptionsStaticMatch {
  constructor({ captionsFolder = './captions/ddd', captions = [] } = []) {
    this.captionsFolder = captionsFolder;
    this.captions = captions.map((c) => (Array.isArray(c) ? c : [c]));
  }

  get name() {
    return 'static-match';
  }

  getZeros(count) {
    let zeros = [];
    for (let i = 0; i < count; i += 1) {
      zeros = [...zeros, 0];
    }
    return zeros;
  }

  async getEpisodeName(episodes) {
    const quote = this.captions[0][0].replace(/\**/g, '');
    const caption = sample(
      getClosestCaption(this.captionsFolder, episodes, quote, 5)
    );
    const { name, match } = caption;
    console.log(`🏹 Closest match for "${quote}": "${match.text}"`);
    const zeros = this.getZeros(this.captions.length - 1);
    this.result = {
      captions: this.captions,
      timestamps: [match.start, ...zeros]
    };
    return name;
  }

  async get() {
    return this.result;
  }
}

module.exports = CaptionsStaticMatch;
