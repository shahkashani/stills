const { sortBy } = require('lodash');
const { compareTwoStrings } = require('string-similarity');
const loadSrt = require('./load-srt');

module.exports = getClosestCaption = (
  folder,
  episodes,
  compare,
  count = 1,
  isCaseSensitive = false
) => {
  const srts = episodes.reduce(
    (memo, name) => ({ ...memo, [name]: loadSrt(`${folder}/${name}.srt`) }),
    {}
  );
  const scores = [];
  episodes.forEach((name) => {
    const lines = srts[name];
    lines.forEach((line, index) => {
      const { text } = line;
      const value = isCaseSensitive
        ? compareTwoStrings(text, compare)
        : compareTwoStrings(text.toLowerCase(), compare.toLowerCase());
      scores.push({
        name,
        index,
        value
      });
    });
  });
  const sortedScores = sortBy(scores, 'value').reverse().slice(0, count);
  return sortedScores.map(({ name, index }) => {
    const captions = srts[name];
    const match = captions[index];
    return {
      captions,
      index,
      name,
      match
    };
  });
};
