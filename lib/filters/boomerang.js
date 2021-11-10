const { transformFrames } = require('./utils');
const { random } = require('lodash');
const getScenes = require('../utils/get-scenes');

class FilterBoomerang {
  constructor({ frames = random(4, 8) } = {}) {
    this.frames = frames;
  }

  get name() {
    return 'boomerang';
  }

  async applyFrames(frames) {
    const file = frames.file;
    const scenes = await getScenes(file);
    const { midpoint } = scenes;

    await transformFrames(file, null, false, (image) => {
      const halfFrames = image.frames.slice(0, midpoint);
      image.frames = [...halfFrames, ...halfFrames.reverse().slice(1, -1)];
      return image;
    });
  }
}

module.exports = FilterBoomerang;
