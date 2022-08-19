const {
  trails,
  boonme,
  blur,
  coins,
  tint,
  chompers,
  celestial,
  outline
} = require('../effects');

const {
  tint: tintBuffer,
  contrast: contrastBuffer,
  outline: outlineBuffer
} = require('../effects/buffer');

const measure = require('../utils/measure');

class FilterArcana {
  constructor({
    hasChompers = false,
    isCelestial = false,
    isBoonme = true,
    useBuffer = true
  } = {}) {
    this.hasChompers = hasChompers;
    this.isCelestial = isCelestial;
    this.isBoonme = isBoonme;
    this.useBuffer = useBuffer;
  }

  get name() {
    return 'arcana';
  }

  async applyFrame(frame, { image, prevFrame }) {
    if (this.useBuffer) {
      await measure('contrast', async () => {
        await contrastBuffer(frame);
      });
      await measure('outline', async () => {
        await outlineBuffer(frame);
      });
    } else {
      await measure('outline', async () => {
        await outline(frame);
      });
    }

    await measure('blur', async () => {
      await blur(frame, { radius: 10, opacity: 0.5 });
    });

    if (this.isCelestial) {
      await celestial(frame);
    }

    if (this.isBoonme) {
      await measure('boonme', async () => {
        await boonme(frame, image, { useWave: true });
      });
    }

    await measure('trails', async () => {
      await trails(frame, { prevFrame, snapshot: this.name });
    });

    await frame.saveSnapshot(this.name);

    await measure('tint', async () => {
      if (this.useBuffer) {
        await tintBuffer(frame, { color: 'rgba(255, 0, 0, 0.9)', gamma: 2 });
      } else {
        await tint(frame, { color: '#c31306', opacity: 0.9 });
      }
    });

    if (this.isBoonme) {
      await measure('coins', async () => {
        await coins(frame, image, {
          color: '#fba155',
          imperfection: 0.3
        });
      });
      if (this.hasChompers) {
        await chompers(frame, { color: '#fba155' });
      }
    }
  }
}

module.exports = FilterArcana;
