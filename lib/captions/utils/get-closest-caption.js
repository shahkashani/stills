const { compareTwoStrings } = require('string-similarity');
const loadSrt = require('./load-srt');

module.exports = getClosestCaption = (folder, episodes, compare) => {
  let matchCaption;
  let matchRating = 0;
  let matchName;
  let matchIndex;
  let matchCaptions;
  episodes.forEach((name) => {
    const lines = loadSrt(`${folder}/${name}.srt`);
    lines.forEach((line, i) => {
      const value = compareTwoStrings(line.text, compare);
      if (value > matchRating) {
        matchCaption = line;
        matchCaptions = lines;
        matchRating = value;
        matchName = name;
        matchIndex = i;
      }
    });
  });
  return {
    captions: matchCaptions,
    index: matchIndex,
    name: matchName,
    match: matchCaption
  };
};
