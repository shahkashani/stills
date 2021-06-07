const loadSrt = require('./utils/load-srt');
const getSrtIndexes = require('./utils/get-srt-indexes');

class CaptionsEpisodes {
  constructor({ folder = './captions/ddd', num = 3, max = 10 } = {}) {
    this.folder = folder;
    this.num = num;
    this.max = max;
  }

  async get(episode) {
    const filename = `${this.folder}/${episode}.srt`;
    const srt = loadSrt(filename);
    const [start, end] = getSrtIndexes(srt, this.num, this.max);
    const group = srt.slice(start, end + 1);
    const captions = group.map(({ text }) => [text]);
    const timestamps = group.map(({ start, end }) => start + (end - start) / 2);
    return { captions, timestamps };
  }
}

module.exports = CaptionsEpisodes;
