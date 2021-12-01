const { exec, trails, boonme, blur, coins, tint } = require('../effects');

class FilterArcana {
  get name() {
    return 'arcana';
  }

  async applyFrame(frame, { image, prevFrame }) {
    await exec(
      frame,
      `\\( +clone -canny 0x1+5%+10% -matte -channel A +level 0,15% \\) -composite -modulate 135,50,100 -fill "#222b6d" -colorize 20 -gamma 0.5 -contrast-stretch 25%x0.05%`
    );
    await blur(frame, { radius: 10, opacity: 0.5 });
    await boonme(frame, image, { wave: '5x25' });
    await trails(frame, { prevFrame, snapshot: this.name });
    await frame.saveSnapshot(this.name);
    await tint(frame, { color: '#a20b00', opacity: 0.9 });
    await coins(frame, { color: '#fba155', debugColor: 'red', blur: 0.05 });
  }
}

module.exports = FilterArcana;
