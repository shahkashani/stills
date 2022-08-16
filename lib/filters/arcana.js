const {
  trails,
  boonme,
  blur,
  coins,
  tint,
  chompers,
  celestial,
  outline,
  contrast
} = require('../effects');

const measure = require('../utils/measure');

class FilterArcana {
  constructor({
    hasChompers = false,
    isCelestial = false,
    isBoonme = true,
    isMesh = false,
    meshOpacity = 0.1
  } = {}) {
    this.hasChompers = hasChompers;
    this.isCelestial = isCelestial;
    this.isBoonme = isBoonme;
    this.isMesh = isMesh;
    this.meshOpacity = meshOpacity;
  }

  get name() {
    return 'arcana';
  }

  async applyFrame(frame, { image, prevFrame }) {
    await measure('outline', async () => {
      await outline(frame);
    });

    await measure('contrast', async () => {
      await contrast(frame);
    });

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

    if (this.isMesh) {
      const humans = await frame.getHumans();
      await humans.drawMesh(frame.file, frame.file, this.meshOpacity);
    }

    await measure('trails', async () => {
      await trails(frame, { prevFrame, snapshot: this.name });
    });

    await frame.saveSnapshot(this.name);

    await measure('tint', async () => {
      await tint(frame, { color: '#c31306', opacity: 0.9 });
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
