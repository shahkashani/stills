const { transformFrames } = require('./utils');
const { random } = require('lodash');

class FilterExperiment {
  get name() {
    return 'experiment';
  }

  transform(base, frame, numFrame, numFrames) {
    if (numFrame < numFrames / 2) {
      return frame;
    }
    const len = frame.length / random(2, 200);
    return [...frame.slice(len), ...frame.slice(0, len)];
  }

  async applyFrames(frames) {
    const file = frames.file;
    await transformFrames(file, this.transform);
  }
}

module.exports = FilterExperiment;
