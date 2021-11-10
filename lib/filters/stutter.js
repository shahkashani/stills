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

  async applyFrames(frames) {
    const file = frames.file;
    await transformFrames(file, null, false, (image) => {
      const { frames } = image;
      const numFrames = Math.min(frames.length, this.numFrames);
      const startAt =
        this.startFrame >= 0
          ? this.startFrame
          : random(0, frames.length - numFrames - 1);

      let newFrame;
      const newFrames = [];
      for (let i = 0; i < numFrames; i += 1) {
        newFrame = frames[startAt + (i % this.stutterLength)];
        if (this.stutterDelay >= 0) {
          newFrame.delay = this.stutterDelay;
        }
        newFrames.push(newFrame);
      }
      const evenMultiplier = numFrames % 2 === 0 ? 0 : 1;
      image.frames = [
        ...frames.slice(0, startAt),
        ...newFrames,
        ...frames.slice(startAt + evenMultiplier)
      ];
      return image;
    });
  }
}

module.exports = FilterStutter;
