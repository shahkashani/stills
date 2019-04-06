const { transformFrames } = require('./utils');
const { random } = require('lodash');

class FilterStutter {
  constructor({ startFrame, numFrames = 6, stutterLength = 2 } = {}) {
    this.startFrame = startFrame;
    this.numFrames = numFrames;
    this.stutterLength = stutterLength;
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

      for (let i = 0; i < numFrames; i += 1) {
        image.frames[startAt + i] =
          image.frames[startAt + (i % this.stutterLength)];
      }
      return image;
    });
  }
}

module.exports = FilterStutter;
