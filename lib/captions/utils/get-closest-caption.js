const { sortBy } = require('lodash');
const { compareTwoStrings } = require('string-similarity');
const loadSrt = require('./load-srt');

module.exports = getClosestCaption = (folder, episodes, compare, count = 1) => {
  const srts = episodes.reduce(
    (memo, name) => ({ ...memo, [name]: loadSrt(`${folder}/${name}.srt`) }),
    {}
  );
  const scores = [];
  episodes.forEach((name) => {
    const lines = srts[name];
    lines.forEach((line, index) => {
      const value = compareTwoStrings(line.text, compare);
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
