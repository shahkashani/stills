const { map } = require('lodash');
const loadSrt = require('./utils/load-srt');
const getSrtIndexes = require('./utils/get-srt-indexes');

class CaptionsEpisodes {
  constructor({
    folder = './captions/ddd',
    num = 3,
    max = 10,
    trueLength = true,
    minLength = 1.2,
    maxLength = 3.5,
    sourceSeconds = null
  } = {}) {
    this.folder = folder;
    this.num = num;
    this.max = max;
    this.trueLength = trueLength;
    this.maxLength = maxLength;
    this.minLength = minLength;
    this.sourceSeconds = sourceSeconds;
  }

  get name() {
    return 'episodes';
  }

  exceedLength({ start, end }) {
    const length = end - start;
    return length < this.minLength || length > this.maxLength;
  }

  async get(episode) {
    const filename = `${this.folder}/${episode}.srt`;
    const srt = loadSrt(filename);
    const [start, end] = getSrtIndexes(
      srt,
      this.num,
      this.max,
      this.sourceSeconds,
      true
    );
    const group = srt.slice(start, end + 1);
    const captions = group.map(({ text }) => [text]);
    const useTrueLength =
      this.trueLength && group.filter((a) => this.exceedLength(a)).length === 0;
    if (useTrueLength) {
      console.log(`📼 Using true lengths`);
    }
    const timestamps = useTrueLength
      ? map(group, 'start')
      : group.map(({ start, end }) => start + (end - start) / 2);
    const lengths = useTrueLength
      ? group.map(({ start, end }) => end - start)
      : null;
    return { captions, timestamps, lengths };
  }
}

module.exports = CaptionsEpisodes;
