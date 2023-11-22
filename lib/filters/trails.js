const { trails } = require('../effects');

const measure = require('../utils/measure');

class FilterTrails {
  get name() {
    return 'trails';
  }

  async applyFrame(frame, { prevFrame }) {
    frame.buffer = await trails(frame.buffer, { prevFrame });
  }
}

module.exports = FilterTrails;
