const { execCmd } = require('./utils');
const { trails, boonme, blur, coins } = require('../effects');

class FilterArcana {
  get name() {
    return 'arcana';
  }
  async applyFrame(frame, { prevFrame }) {
    const { file } = frame;
    execCmd(
      `convert "${file}" \\( +clone -canny 0x1+5%+10% -matte -channel A +level 0,15% \\) -composite "${file}"`
    );
    execCmd(
      `convert "${file}" -modulate 135,50,100 -fill "#222b6d" -colorize 20 -gamma 0.5 -contrast-stretch 25%x0.05% "${file}"`
    );
    await blur(frame, { radius: 10, opacity: 0.5 });
    await boonme(frame);
    await trails(frame, { prevFrame, snapshot: this.name });
    await frame.saveSnapshot(this.name);
    execCmd(`convert "${file}" -fill "#a20b00" -tint 90% "${file}"`);
    await coins(frame, { fill: '#fba155', blur: 0 });
  }
}

module.exports = FilterArcana;
