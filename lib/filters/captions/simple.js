const { existsSync } = require('fs');
const Canvas = require('canvas');
const { drawText } = require('canvas-txt');
const sharp = require('../../utils/sharp');
const isUppercasy = require('../../utils/is-uppercasy');

class FilterSimpleCaptions {
  constructor({
    font = './fonts/arial.ttf',
    lineHeight = 1.2,
    boxWidth = 0.8,
    fontSize = 1,
    bottomOffset = 1,
    color = 'white',
    isStripNewline = false
  } = {}) {
    this.font = font;
    this.lineHeight = lineHeight;
    this.bottomOffset = bottomOffset;
    this.color = color;
    this.boxWidth = boxWidth;
    this.fontSize = fontSize;
    this.isStripNewline = isStripNewline;
    if (this.font && !existsSync(this.font)) {
      console.log(`🐞 Yo, this font does not exist: ${this.font}`);
    }
  }

  get name() {
    return 'simple';
  }

  getFontSize(caption, width) {
    return Math.round(
      (isUppercasy(caption) ? width / 22 : width / 20) * this.fontSize
    );
  }

  async apply(frame, text) {
    const { width, height } = frame.getInfo();

    let caption = text
      .toString()
      .replace(/\*/g, '')
      .replace(/‐/g, '-')
      .replace(/(["-])/g, '$1');

    if (this.isStripNewline) {
      caption = caption.replace(/\n/g, ' ').replace(/\s{2,}/g, ' ');
    }

    const canvas = Canvas.createCanvas(width, height);
    Canvas.registerFont(this.font, {
      family: 'fieriframes'
    });

    const ctx = canvas.getContext('2d');

    ctx.fillStyle = this.color;
    ctx.shadowColor = 'black';
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;

    const fontSize = this.getFontSize(caption, width) * this.fontSize;
    const lineHeight = fontSize * this.lineHeight;

    const bottomOffset = fontSize * this.bottomOffset;
    const textBoxHeight = height - bottomOffset;

    const options = {
      height: textBoxHeight,
      vAlign: 'bottom',
      font: 'fieriframes',
      fontSize,
      lineHeight
    };

    drawText(ctx, caption, {
      ...options,
      y: 0,
      x: (width * (1 - this.boxWidth)) / 2,
      width: width * this.boxWidth
    });

    const buffer = await sharp(frame.buffer)
      .composite([{ input: canvas.toBuffer() }])
      .removeAlpha()
      .toBuffer();

    frame.buffer = buffer;
  }
}

module.exports = FilterSimpleCaptions;
