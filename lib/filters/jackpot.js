const { spirits } = require('../effects');
const measure = require('../utils/measure');

class FilterJackpot {
  get name() {
    return 'jackpot';
  }

  async applyFrame(frame) {
    let buffer = frame.buffer;
    buffer = await measure('spirits', () => spirits(buffer, frame));
    frame.buffer = buffer;
  }
}

module.exports = FilterJackpot;
