const {
  sortBy,
  sample,
  flatten,
  cloneDeep,
  range,
  findIndex
} = require('lodash');
const { compareTwoStrings } = require('string-similarity');
const loadSrt = require('./load-srt');
const getSrtIndexes = require('./get-srt-indexes');
const MatchSentence = require('./match-sentence');

class CaptionFinder {
  constructor({ folder, episodes, randomize = 1, matchParams = {} }) {
    this.folder = folder;
    this.episodes = episodes;
    this.randomize = randomize;
    this.corpusCache = null;
    this.findCache = {};
    this.matchParams = matchParams;
    this.matchSentence = MatchSentence(matchParams);
  }

  get corpus() {
    if (this.corpusCache) {
      return this.corpusCache;
    }
    this.corpusCache = this.episodes.reduce(
      (memo, name) => ({
        ...memo,
        [name]: loadSrt(`${this.folder}/${name}.srt`)
      }),
      {}
    );
    return this.corpusCache;
  }

  getTimestamp(match) {
    return (match.end - match.start) / 2;
  }

  getScoresForString(compare, matchedIndex = 0) {
    const scores = [];
    const cacheKey = compare.toLowerCase();
    if (this.findCache[cacheKey]) {
      return this.findCache[cacheKey];
    }
    this.episodes.forEach((name) => {
      const lines = this.corpus[name];
      lines.forEach((line, index) => {
        const { text } = line;
        scores.push({
          matchedIndex,
          name,
          index,
          query: compare,
          score: compareTwoStrings(text.toLowerCase(), compare.toLowerCase()),
          ...line
        });
      });
    });
    const result = sortBy(scores, 'score').reverse().slice(0, this.randomize);
    this.findCache[cacheKey] = result;
    return result;
  }

  formatResult(result) {
    return result;
  }

  getZeros(count) {
    let zeros = [];
    for (let i = 0; i < count; i += 1) {
      zeros = [...zeros, 0];
    }
    return zeros;
  }

  getTimestamps(match, captions) {
    const num = captions.length;
    const { query, name, index } = match;
    const queryIndex = captions.indexOf(query);
    const startIndex = index - queryIndex;
    const srt = this.corpus[name];
    const group = srt.slice(startIndex, startIndex + num);
    const timestamps = group.map(({ start, end }) => start + (end - start) / 2);
    return [...timestamps, ...this.getZeros(num - timestamps.length)];
  }

  formatMatch(match, captions) {
    const timestamps = this.getTimestamps(match, captions);
    const { name } = match;
    return {
      name,
      timestamps,
      match,
      captions
    };
  }

  find(compare, num = null, matchString = null) {
    const captions = Array.isArray(compare) ? compare : [compare];
    const results = matchString
      ? this.getScoresForString(matchString)
      : flatten(captions.map((c, i) => this.getScoresForString(c, i)));
    const sorted = sortBy(results, 'score').reverse().slice(0, this.randomize);
    const match = sample(sorted);

    if (Number.isFinite(num) && captions.length < num) {
      return this.getExtendedMatch(match, captions, num);
    } else {
      return this.formatMatch(match, captions);
    }
  }

  getExtendedMatch(match, captions, num) {
    const { name, index, matchedIndex } = match;
    const srt = cloneDeep(this.corpus[name]);

    const srtStartIndex = index - matchedIndex;

    captions.forEach((caption, index) => {
      const srtIndex = index + srtStartIndex;
      const previous = srtStartIndex > 0 ? srt[srtIndex - 1].text : null;
      const current = srt[srtIndex].text;
      const rewritten = this.matchSentence(caption, current, previous);
      srt[srtIndex].text = rewritten;
    });

    /** This can be improved, I don't think it considers whether or not the caption text will be truncated */
    const [start, end] = getSrtIndexes(
      srt,
      num,
      10,
      index - Math.floor(num / 2)
    );

    const group = srt.slice(start, end + 1);
    return {
      match,
      captions: group.map(({ text }) => text),
      timestamps: group.map(({ start, end }) => start + (end - start) / 2)
    };

    /*
    const srt = this.corpus[name];
    const srtStart = index - Math.floor(num / 2);
    const [start, end] = getSrtIndexes(srt, num, 10, srtStart);
    let group = cloneDeep(srt.slice(start, end + 1));

    const indexInGroup = findIndex(group, { text: match.text });
    const diff = Math.max(0, indexInGroup - matchedIndex);


    for (let i = 0; i < captions.length; i += 1) {
      const currentText = captions[i];
      const currentIndex = index + i;
      const previous = currentIndex > 0 ? srt[currentIndex - 1].text : null;
      const matchText = group[i + diff].text;
      if (matchText) {
        group[i + diff].text = this.matchSentence(
          currentText,
          matchText,
          previous
        );
      } else {
        group[i + diff].text = currentText;
      }
    }

    return {
      match,
      captions: group.map(({ text }) => text),
      timestamps: group.map(({ start, end }) => start + (end - start) / 2)
    };
    */
  }
}

module.exports = CaptionFinder;
