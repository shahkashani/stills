const { sortBy, sample, flatten, cloneDeep } = require('lodash');
const { stringSimilarity } = require('string-similarity-js');
const getSrtIndexes = require('./get-srt-indexes');
const MatchSentence = require('./match-sentence');
const CaptionLoader = require('./caption-loader');
const compareFn = stringSimilarity;

class CaptionFinder {
  constructor({ folder, redis, episodes, randomize = 1, matchParams = {} }) {
    this.episodes = episodes;
    this.randomize = randomize;
    this.folder = folder;
    this.findCache = {};
    this.matchParams = matchParams;
    this.matchSentence = MatchSentence(matchParams);
    this.loader = new CaptionLoader({
      redis,
      episodes,
      folder
    });
  }

  getTimestamp(match) {
    return (match.end - match.start) / 2;
  }

  getScoresForString(corpus, compare, matchedIndex = 0) {
    const scores = [];
    const cacheKey = compare.toString().toLowerCase();
    if (this.findCache[cacheKey]) {
      return this.findCache[cacheKey];
    }
    const lengthA = compare.toString().split(' ').length;
    this.episodes.forEach((name) => {
      const lines = corpus[name];
      lines.forEach((line, index) => {
        const { text } = line;
        const lengthB = text.split(' ').length;
        scores.push({
          matchedIndex,
          name,
          index,
          query: compare,
          score:
            lengthA !== lengthB
              ? 0
              : compareFn(text.toLowerCase(), compare.toString().toLowerCase()),
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

  getTimestamps(corpus, match, captions) {
    const num = captions.length;
    const { query, name, index } = match;
    const queryIndex = captions.indexOf(query);
    const startIndex = index - queryIndex;
    const srt = corpus[name];
    const group = srt.slice(startIndex, startIndex + num);
    const timestamps = group.map(({ start, end }) => start + (end - start) / 2);
    return [...timestamps, ...this.getZeros(num - timestamps.length)];
  }

  formatMatch(corpus, match, captions) {
    const timestamps = this.getTimestamps(corpus, match, captions);
    const { name } = match;
    return {
      name,
      timestamps,
      match,
      captions
    };
  }

  async find(compare, num = null, matchString = null) {
    const corpus = await this.loader.getAllCaptions();
    const captions = Array.isArray(compare) ? compare : [compare];
    const results = matchString
      ? this.getScoresForString(corpus, matchString)
      : flatten(captions.map((c, i) => this.getScoresForString(corpus, c, i)));
    const sorted = sortBy(results, 'score').reverse().slice(0, this.randomize);
    const match = sample(sorted);

    if (Number.isFinite(num) && captions.length < num) {
      return this.getExtendedMatch(corpus, match, captions, num);
    } else {
      return this.formatMatch(corpus, match, captions);
    }
  }

  getExtendedMatch(corpus, match, captions, num) {
    const { name, index, matchedIndex } = match;
    const srt = cloneDeep(corpus[name]);

    const srtStartIndex = index - matchedIndex;

    captions.forEach((caption, index) => {
      const srtIndex = index + srtStartIndex;
      const previous = srtStartIndex > 0 ? srt[srtIndex - 1].text : null;
      const current = srt[srtIndex].text;
      const rewritten = this.matchSentence(caption, current, previous);
      srt[srtIndex].text = rewritten;
    });

    const [start, end] = getSrtIndexes(
      srt,
      num,
      10,
      index - Math.floor(num / 2)
    );

    const group = srt.slice(start, end + 1);
    return {
      name,
      match,
      captions: group.map(({ text }) => text),
      timestamps: group.map(({ start, end }) => start + (end - start) / 2)
    };
  }
}

module.exports = CaptionFinder;
