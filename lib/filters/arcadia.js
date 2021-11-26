const { exec, trails, boonme, blur, coins } = require('../effects');

class FilterArcadia {
  get name() {
    return 'arcadia';
  }

  async applyFrame(frame, { prevFrame }) {
    await exec(
      frame,
      `-modulate 135,10,100 -fill "#222b6d" -colorize 20 -gamma 0.5 -contrast-stretch 25%x0.05%`
    );
    await blur(frame, { radius: 10, opacity: 0.5 });
    await boonme(frame);
    await trails(frame, { prevFrame, snapshot: this.name });
    await frame.saveSnapshot(this.name);
    await coins(frame);
  }
}

module.exports = FilterArcadia;
