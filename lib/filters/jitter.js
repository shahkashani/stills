const { chunk, flatten } = require('lodash');

class FilterJitter {
  get name() {
    return 'jitter';
  }

  async applyImage(image) {
    image.frames.frames = flatten(
      chunk(image.frames.frames, 2).map((chunk) => chunk.reverse())
    );
  }
}

module.exports = FilterJitter;
