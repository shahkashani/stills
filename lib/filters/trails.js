const { trails } = require('../effects');

class FilterTrails {
  get name() {
    return 'trails';
  }

  async applyFrame(frame, { prevFrame }) {
    frame.buffer = await trails(frame.buffer, { prevFrame });
  }
}

module.exports = FilterTrails;
