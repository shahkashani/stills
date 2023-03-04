const {
  boonme: boonmeClassic,
  tint: tintClassic,
  outline: outlineClassic,
  trails: trailsClassic
} = require('../effects/classic');

const {
  tint,
  contrast,
  outline,
  trails,
  blur,
  boonme,
  coins,
  bodies,
  dots
} = require('../effects');

const measure = require('../utils/measure');

class FilterArcana {
  constructor({
    hasChompers = false,
    isBodies = false,
    isDots = true,
    isBoonme = true,
    useClassic = false
  } = {}) {
    this.hasChompers = hasChompers;
    this.isBodies = isBodies;
    this.isBoonme = isBoonme;
    this.isDots = isDots;
    this.useClassic = useClassic;
  }

  get name() {
    return 'arcana';
  }

  async applyClassic(buffer, { frame, image, prevFrame }) {
    await measure('faces', () => frame.detectHumans());
    buffer = await measure('outline', () => outlineClassic(buffer));
    buffer = await measure('blur', () => blur(buffer));
    if (this.isDots) {
      buffer = await measure('dots', () => dots(buffer, frame, image));
    }
    if (this.isBoonme) {
      buffer = await measure('boonme', () =>
        boonmeClassic(buffer, frame, image, { useWave: true })
      );
    }
    if (this.isBodies) {
      buffer = await measure('bodies', () => bodies(buffer, frame));
    }
    buffer = await measure('trails', () =>
      trailsClassic(buffer, { prevFrame, snapshot: this.name })
    );
    await frame.saveSnapshot(this.name, buffer);
    buffer = await measure('tint', () =>
      tintClassic(buffer, { color: '#c31306', opacity: 0.9 })
    );
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
    if (this.isDots) {
      buffer = await measure('dots', () => dots(buffer, frame, image));
    }
    if (this.isBoonme) {
      buffer = await measure('boonme', async () =>
        boonme(buffer, frame, image)
      );
    }
    if (this.isBodies) {
      buffer = await measure('bodies', () => bodies(buffer, frame));
    }
    buffer = await measure('trails', () =>
      trailsClassic(buffer, { prevFrame, snapshot: this.name })
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
