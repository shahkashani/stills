const { map } = require('lodash');

const getStreaks = (counts) => {
  const paddedCounts = [...counts, -1];
  const streaks = [];
  let prevCount = counts[0];
  let currentCount = -1;
  for (const count of paddedCounts) {
    currentCount += 1;
    if (prevCount !== count) {
      streaks.push({
        faces: prevCount,
        count: currentCount
      });
      currentCount = 0;
    }
    prevCount = count;
  }
  return streaks;
};

module.exports = (datas) => {
  const streaks = getStreaks(map(datas, 'count'));
  return { streaks };
};
