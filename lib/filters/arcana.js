const {
  boonme: boonmeClassic,
  tint: tintClassic,
  outline: outlineClassic,
} = require('../effects/classic');

const {
  tint,
  contrast,
  outline,
  trails,
  blur,
  boonme,
  coins
} = require('../effects');

const measure = require('../utils/measure');

class FilterArcana {
  constructor({
    hasChompers = false,
    isCelestial = false,
    isBoonme = true,
    useClassic = true
  } = {}) {
    this.hasChompers = hasChompers;
    this.isCelestial = isCelestial;
    this.isBoonme = isBoonme;
    this.useClassic = useClassic;
  }

  get name() {
    return 'arcana';
  }

  async applyClassic(buffer, { frame, image, prevFrame }) {
    await measure('faces', () => frame.detectHumans());
    buffer = await measure('outline', () => outlineClassic(buffer));
    buffer = await measure('blur', () => blur(buffer));
    if (this.isBoonme) {
      buffer = await measure('boonme', () =>
        boonmeClassic(buffer, frame, image, { useWave: true })
      );
    }
    buffer = await measure('trails', () =>
      trails(buffer, { prevFrame, snapshot: this.name })
    );
    await frame.saveSnapshot(this.name, buffer);
    buffer = await measure('tint', () => tintClassic(buffer, { color: '#c31306', opacity: 0.9 }));

    if (this.isBoonme) {
      buffer = await measure('coins', () => coins(buffer, frame));
    }
    return buffer;
  }

  async applyFrame(frame, { image, prevFrame }) {
    let buffer = frame.buffer;

    if (this.useClassic) {
      frame.buffer = await this.applyClassic(buffer, {
        frame,
        image,
        prevFrame
      });
      return;
    }

    await measure('faces', () => frame.detectHumans());

    buffer = await measure('contrast', () => contrast(buffer));
    buffer = await measure('outline', () => outline(buffer));
    buffer = await measure('blur', () => blur(buffer));

    if (this.isBoonme) {
      buffer = await measure('boonme', async () =>
        boonme(buffer, frame, image)
      );
    }

    buffer = await measure('trails', () =>
      trails(buffer, { prevFrame, snapshot: this.name })
    );

    await frame.saveSnapshot(this.name, buffer);

    buffer = await measure('tint', () => tint(buffer));

    if (this.isBoonme) {
      buffer = await measure('coins', () => coins(buffer, frame));
    }

    frame.buffer = buffer;
  }
}

module.exports = FilterArcana;
