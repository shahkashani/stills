const { transformFrames } = require('./utils');
const { random } = require('lodash');

class FilterStutter {
  constructor({
    startFrame,
    numFrames = 6,
    stutterLength = 2,
    stutterDelay = null
  } = {}) {
    this.startFrame = startFrame;
    this.numFrames = numFrames;
    this.stutterLength = stutterLength;
    this.stutterDelay = stutterDelay;
  }

  get name() {
    return 'stutter';
  }

  async apply(file) {
    await transformFrames(file, null, false, image => {
      const numFrames = Math.min(image.frames.length, this.numFrames);
      const startAt =
        this.startFrame >= 0
          ? this.startFrame
          : random(0, image.frames.length - numFrames - 1);

      let newFrame;
      for (let i = 0; i < numFrames; i += 1) {
        newFrame = image.frames[startAt + (i % this.stutterLength)];
        if (this.stutterDelay >= 0) {
          newFrame.delay = this.stutterDelay;
        }
        image.frames[startAt + i] = newFrame;
      }
      return image;
    });
  }
}

module.exports = FilterStutter;
