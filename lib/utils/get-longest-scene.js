module.exports = getLongestScene = (scenes) => {
  let longestScene = scenes[0];
  for (const scene of scenes) {
    if (scene.length > longestScene.length) {
      longestScene = scene;
    }
  }
  return longestScene;
};
