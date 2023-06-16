const { blur, boonme, coins, highc } = require('../effects');
const { trails } = require('../effects/classic');
const measure = require('../utils/measure');

class FilterArcadia {
  constructor({ coin = '#eeeeee', isGrayscale = true, isBlur = true } = {}) {
    this.coin = coin;
    this.isGrayscale = isGrayscale;
    this.isBlur = isBlur;
  }

  get name() {
    return 'arcadia';
  }

  async applyFrame(frame, { image, prevFrame }) {
    let buffer = frame.buffer;

    if (this.isGrayscale) {
      buffer = await measure('contrast', () => highc(buffer));
    }
    if (this.isBlur) {
      buffer = await measure('blur', () =>
        blur(buffer, { radius: 10, opacity: 0.5 })
      );
    }
    buffer = await measure('boonme', () =>
      boonme(buffer, frame, { useWave: false })
    );
    buffer = await measure('trails', () =>
      trails(buffer, { prevFrame, snapshot: this.name })
    );
    await frame.saveSnapshot(this.name, buffer);
    buffer = await measure('coins', () =>
      coins(buffer, frame, { color: this.coin })
    );
    frame.buffer = buffer;
  }
}

module.exports = FilterArcadia;
