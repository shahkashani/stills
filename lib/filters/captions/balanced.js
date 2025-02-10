const { existsSync } = require('fs');
const Canvas = require('canvas');
const { drawText, splitText } = require('canvas-txt');
const sharp = require('../../utils/sharp');
const isUppercasy = require('../../utils/is-uppercasy');
const { mean } = require('lodash');

class FilterBalancedCaptions {
  constructor({
    font = './fonts/arial.ttf',
    lineHeight = 1.2,
    boxWidth = 0.8,
    fontSize = 1,
    bottomOffset = 1,
    color = 'white',
    isStripNewline = false,
    distributionMinBoxWidth = 0.5,
    // The higher, the closer to the average the line needs to be
    distributionTolerance = 0.8
  } = {}) {
    this.font = font;
    this.distributionMinBoxWidth = distributionMinBoxWidth;
    this.distributionTolerance = distributionTolerance;
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
    return 'balanced';
  }

  getFontSize(caption, width) {
    return Math.round(
      (isUppercasy(caption) ? width / 22 : width / 20) * this.fontSize
    );
  }

  getBoxWidth(ctx, text, options, width, initialBoxWidth) {
    let isDone = false;

    let currentBoxWidth = initialBoxWidth;

    while (!isDone && currentBoxWidth >= this.distributionMinBoxWidth) {
      const lines = splitText({
        ctx,
        text,
        ...options,
        y: 0,
        x: (width * (1 - currentBoxWidth)) / 2,
        width: width * currentBoxWidth
      });

      if (lines.length < 2) {
        return currentBoxWidth;
      }

      const averageLineLength = mean(
        lines.slice(0, lines.length - 1).map((line) => line.length)
      );

      for (const line of lines) {
        console.log(
          `💬 Line deviation: "${line}: ${line.length / averageLineLength}`
        );
      }

      const lineDeviates = lines.find((line) => {
        return line.length / averageLineLength < this.distributionTolerance;
      });

      if (lineDeviates) {
        currentBoxWidth -= 0.05;
        console.log(
          `💬 This line deviates too much from the average width: "${lineDeviates}"`
        );
        console.log(`💬 Reducing the box width to ${currentBoxWidth}.`);
      } else {
        isDone = true;
      }
    }

    if (currentBoxWidth >= this.distributionMinBoxWidth) {
      console.log(`💬 Found a good box width: ${currentBoxWidth}`);
      return currentBoxWidth;
    } else {
      console.log('💬 Could find a good boxwidth, going with the original.');
      return initialBoxWidth;
    }
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

    // Not sure why this is necessary, but the measurement doesn't work without it.
    drawText(ctx, '', {
      ...options
    });

    const newBoxWidth = this.getBoxWidth(
      ctx,
      caption,
      options,
      width,
      this.boxWidth
    );

    drawText(ctx, caption, {
      ...options,
      y: 0,
      x: (width * (1 - newBoxWidth)) / 2,
      width: width * newBoxWidth
    });

    const buffer = await sharp(frame.buffer)
      .composite([{ input: canvas.toBuffer() }])
      .removeAlpha()
      .toBuffer();

    frame.buffer = buffer;
  }
}

module.exports = FilterBalancedCaptions;
