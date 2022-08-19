const {
  trails: trailsFs,
  boonme: boonmeFs,
  blur: blurFs,
  coins: coinsFs,
  tint: tintFs,
  outline: outlineFs
} = require('../effects');

const {
  tint,
  contrast,
  outline,
  trails,
  blur,
  boonme,
  coins
} = require('../effects/buffer');

const measure = require('../utils/measure');

const { readFileSync, writeFileSync } = require('fs');

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

  async applyFrameFs(frame, { image, prevFrame }) {
    await measure('outline', async () => {
      await outlineFs(frame);
    });
    await measure('blur', async () => {
      await blurFs(frame, { radius: 10, opacity: 0.5 });
    });
    if (this.isBoonme) {
      await measure('boonme', async () => {
        await boonmeFs(frame, image, { useWave: true });
      });
    }
    await measure('trails', async () => {
      await trailsFs(frame, { prevFrame, snapshot: this.name });
    });
    await frame.saveSnapshot(this.name);
    await measure('tint', async () => {
      await tintFs(frame, { color: '#c31306', opacity: 0.9 });
    });
    if (this.isBoonme) {
      await measure('coins', async () => {
        await coinsFs(frame, image, {
          color: '#fba155',
          imperfection: 0.3
        });
      });
    }
  }

  async applyFrame(frame, { image, prevFrame }) {
    if (!this.useBuffer) {
      return await this.applyFrameFs(frame, { image, prevFrame });
    }

    let buffer = readFileSync(frame.file);
    buffer = await measure('contrast', () => contrast(buffer));
    buffer = await measure('outline', () => outline(buffer));
    buffer = await measure('blur', () => blur(buffer));
    if (this.isBoonme) {
      buffer = await measure('boonme', async () => boonme(buffer, frame));
    }
    buffer = await measure('trails', () =>
      trails(buffer, { prevFrame, snapshot: this.name })
    );
    await frame.saveSnapshot(this.name, buffer);
    buffer = await measure('tint', () => tint(buffer));
    if (this.isBoonme) {
      buffer = await measure('coins', () => coins(buffer, frame));
    }
    writeFileSync(frame.file, buffer);
  }
}

module.exports = FilterArcana;
