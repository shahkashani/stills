const {
  exec,
  trails,
  boonme,
  blur,
  coins,
  tint,
  chompers,
  celestial
} = require('../effects');

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
    await exec(
      frame,
      `\\( +clone -canny 0x1+5%+10% -matte -channel A +level 0,15% \\) -composite -modulate 135,50,100 -fill "#222b6d" -colorize 20 -gamma 0.5 -contrast-stretch 25%x0.05%`
    );
    await blur(frame, { radius: 10, opacity: 0.5 });
    if (this.isCelestial) {
      await celestial(frame);
    }
    if (this.isBoonme) {
      await boonme(frame, image, { useWave: true });
    }
    if (this.isMesh) {
      const humans = await frame.getHumans();
      await humans.drawMesh(frame.edited, frame.edited, this.meshOpacity);
    }
    await trails(frame, { prevFrame, snapshot: this.name });
    await frame.saveSnapshot(this.name);
    await tint(frame, { color: '#c31306', opacity: 0.9 });
    if (this.isBoonme) {
      await coins(frame, {
        color: '#fba155',
        blur: 0.05,
        imperfection: 0.3
      });
      if (this.hasChompers) {
        await chompers(frame, { color: '#fba155' });
      }
    }
  }
}

module.exports = FilterArcana;
