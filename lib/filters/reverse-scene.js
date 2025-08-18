const getLongestScene = require('../utils/get-longest-scene');

class FilterReverseScene {
  get name() {
    return 'reverse-scene';
  }

  async applyImage(image) {
    const frames = await image.getFrames();
    const scenes = await image.getScenes();
    const longestScene = getLongestScene(scenes);
    const startIndex = longestScene[0];
    const endIndex = longestScene[longestScene.length - 1];

    console.log('Scenes', scenes);

    image.frames.frames = [
      ...frames.slice(0, startIndex),
      ...frames.slice(startIndex, endIndex + 1).reverse(),
      ...frames.slice(endIndex + 1, frames.length + 1)
    ];

    console.log(
      'After',
      image.frames.frames.map((frame) => frame.index)
    );
  }
}

module.exports = FilterReverseScene;
