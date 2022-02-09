const { exec, trails, boonme, blur, coins } = require('../effects');

class FilterArcadia {
  constructor({ coin = '#eeeeee', isGrayscale = true } = {}) {
    this.coin = coin;
    this.isGrayscale = isGrayscale;
  }

  get name() {
    return 'arcadia';
  }

  async applyFrame(frame, { image, prevFrame }) {
    if (this.isGrayscale) {
      await exec(
        frame,
        `-modulate 135,10,100 -fill "#222b6d" -colorize 20 -gamma 0.5 -contrast-stretch 25%x0.05%`
      );
    }
    await blur(frame, { radius: 10, opacity: 0.5 });
    await boonme(frame, image);
    await trails(frame, { prevFrame, snapshot: this.name });
    await frame.saveSnapshot(this.name);
    await coins(frame, { color: this.coin });
  }
}

module.exports = FilterArcadia;
