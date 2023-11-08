const { tint } = require('../effects');
const sharp = require('../utils/sharp');

class FilterColorTone {
  constructor({ color = [165, 42, 42], opacity = 0.3 } = {}) {
    this.color = color;
    this.opacity = opacity;
  }

  get name() {
    return 'colortone';
  }

  async applyFrame(frame) {
    const tinted = await tint(frame.buffer, {
      color: this.color
    });
    frame.buffer = await sharp(frame.buffer)
      .composite([
        { input: await sharp(tinted).ensureAlpha(this.opacity).toBuffer() }
      ])
      .removeAlpha()
      .toBuffer();
  }
}

module.exports = FilterColorTone;
