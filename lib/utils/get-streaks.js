const getStreaks = (counts, startIndex = 0) => {
  const paddedCounts = [...counts, -1];
  const streaks = [];
  let prevCount = counts[0];
  let currentCount = -1;
  let indexes = [];
  let i = 0;
  for (const count of paddedCounts) {
    currentCount += 1;
    if (prevCount !== count) {
      streaks.push({
        faces: prevCount,
        count: currentCount,
        indexes: [...indexes]
      });
      currentCount = 0;
      indexes.length = 0;
    }
    prevCount = count;
    indexes.push(i + startIndex);
    i += 1;
  }
  return streaks;
};

module.exports = (counts, scenes = null) => {
  if (scenes) {
    const countsArrays = scenes.map((scene) => scene.map((i) => counts[i]));
    const results = [];
    let startIndex = 0;

    for (const countsArray of countsArrays) {
      results.push(getStreaks(countsArray, startIndex));
      startIndex += countsArray.length;
    }
    return results;
  }
  return getStreaks(counts);
};
