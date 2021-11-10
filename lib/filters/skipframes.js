const { transformFrames } = require('./utils');
const { random } = require('lodash');

class FilterSkipFrames {
  constructor({ frames = random(4, 8) } = {}) {
    this.frames = frames;
  }

  get name() {
    return 'skipframes';
  }

  async applyFrames(frames) {
    const file = frames.file;
    const {  numFrames } = frames.getInfo();
    const frame = random(4, Math.round(numFrames / 2));

    await transformFrames(file, null, false, (image) => {
      const { frames } = image;
      image.frames = [
        ...frames.slice(0, frame),
        ...frames.slice(frame + this.frames)
      ];
      return image;
    });
  }
}

module.exports = FilterSkipFrames;
