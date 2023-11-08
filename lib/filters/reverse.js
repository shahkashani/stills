class FilterReverse {
  get name() {
    return 'reverse';
  }

  async applyImage(image) {
    image.frames.frames = image.frames.frames.reverse();
  }
}

module.exports = FilterReverse;
