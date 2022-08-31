const { existsSync } = require('fs');
const { execCmd, parseImageMagickMetrics } = require('../utils');
const isUppercasy = require('../../utils/is-uppercasy');
const measure = require('../../utils/measure');
const gm = require('gm').subClass({ imageMagick: true });
const Canvas = require('canvas');
const canvasTxt = require('canvas-txt').default;
const sharp = require('../../utils/sharp');

class FilterSimpleCaptions {
  constructor({
    font = './fonts/arial.ttf',
    glyphs = false,
    shadowOffset = 1,
    lineHeight = 0,
    paddingFactor = 1,
    boxWidth = 0.8,
    fontSize = 1,
    color = 'white'
  } = {}) {
    this.font = font;
    this.shadowOffset = shadowOffset;
    this.glyphs = glyphs;
    this.paddingFactor = paddingFactor;
    this.lineHeight = lineHeight;
    this.color = color;
    this.boxWidth = boxWidth;
    this.fontSize = fontSize;
    if (this.font && !existsSync(this.font)) {
      console.log(`🐞 Yo, this font does not exist: ${this.font}`);
    }
  }

  get name() {
    return 'captions';
  }

  wrapCaption(fullCaption) {
    const caption = fullCaption.replace(/\n/g, ' ');
    const split = fullCaption.split(' ');

    if (split.length <= 2) {
      return fullCaption;
    }

    const splitIndex = split.reduce(
      (memo, word) =>
        memo <= caption.length / 2 ? memo + word.length + 1 : memo,
      0
    );
    return splitIndex === 0
      ? caption
      : `${caption.slice(0, splitIndex).trim()}\n${caption
          .slice(splitIndex)
          .trim()}`;
  }

  getFontMetrics(caption, width) {
    const cmdText = this.getCmdText({
      caption,
      width
    })
      .map((s) => s.join(' '))
      .join(' ');
    const cmd = `convert -debug annotate -log "%e" ${cmdText} 2>&1 | grep -i Metrics:`;
    const output = execCmd(cmd);

    return parseImageMagickMetrics(output);
  }

  // Captions that wrap over more lines than expected get formatted into prettier centered captions
  async getSmartWrappedCaption(caption, width) {
    const numExpectedLines = caption.match(/\n/) ? 2 : 1;
    const metrics = this.getFontMetrics(caption, width);
    if (metrics.length <= numExpectedLines) {
      return caption;
    }
    console.log(
      `🤔 Was expecting ${numExpectedLines} lines, but got ${metrics.length}. Wrapping.`
    );
    const wrappedCaption = this.wrapCaption(caption);
    const wrappedCaptionMetrics = this.getFontMetrics(wrappedCaption, width);
    if (wrappedCaptionMetrics.length > 2) {
      console.log(
        `🤔 Wrapped lines exceed 2 (${wrappedCaptionMetrics.length}). Giving up.`
      );
      console.log(wrappedCaptionMetrics);
      // At this point we kinda just give up and let Imagemagick wrap as it best sees fit
      return caption.replace(/\n/g, ' ').replace(/\s{2,}/g, ' ');
    }
    return wrappedCaption;
  }

  getFontSize(caption, width) {
    return (isUppercasy(caption) ? width / 22 : width / 20) * this.fontSize;
  }

  getCmdText({ caption, width, color = 'black', offset = 0 }) {
    const cleanCaption = (caption || '').replace(/(["-])/g, '\\$1');
    const boxWidth = width * this.boxWidth;
    const fontSize = this.getFontSize(caption, width);
    const padding = fontSize * this.paddingFactor;
    const fontCmd = this.font ? [['-font', this.font]] : [];
    const offsetX = offset;
    const offsetY = padding - offset;
    const lineHeightCmd = this.lineHeight
      ? [['-interline-spacing', fontSize * this.lineHeight]]
      : [];
    return [
      ['-pointsize', fontSize],
      ...fontCmd,
      ['-size', `${boxWidth}x`],
      ['-gravity', 'South'],
      ['-fill', color],
      ...lineHeightCmd,
      ['-background', 'none'],
      [`caption:"${cleanCaption}"`],
      ['-geometry', `+${offsetX}+${offsetY}`]
    ];
  }

  async getCmd(fullCaption, width) {
    const caption = await measure('wrap', () =>
      this.getSmartWrappedCaption(fullCaption, width)
    );
    const cmdBlackText = this.getCmdText({
      caption,
      width,
      color: 'black',
      offset: this.shadowOffset
    });
    const cmdWhiteText = this.getCmdText({
      caption,
      width,
      color: this.color
    });
    return [
      ...cmdBlackText,
      ['-composite'],
      ...cmdWhiteText,
      ['-composite'],
      ['-dither', 'None']
    ];
  }

  async apply(frame, text, { image }) {
    const { width } = image.getInfo();

    if (!text) {
      return;
    }
    const caption = text.replace(/\*/g, '').replace(/‐/g, '-');
    const cmds = await this.getCmd(caption, width);

    let base = gm(frame.buffer).command('convert');

    cmds.forEach((cmd) => {
      base = base.out(...cmd);
    });

    return new Promise(async (resolve, reject) => {
      base.toBuffer('PNG', (err, buffer) => {
        if (err) {
          return reject(err);
        }
        frame.buffer = buffer;
        resolve();
      });
    });
  }

  async applyNew(frame, text, { image }) {
    const { width, height } = image.getInfo();

    const caption = text
      .replace(/\*/g, '')
      .replace(/‐/g, '-')
      .replace(/(["-])/g, '\\$1')
      .replace(/\n/g, ' ')
      .replace(/\s{2,}/g, ' ');

    const canvas = Canvas.createCanvas(width, height);
    Canvas.registerFont(this.font, {
      family: 'fieriframes'
    });

    const ctx = canvas.getContext('2d');

    ctx.fillStyle = this.color;
    ctx.shadowColor = 'black';
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;

    const fontSize = this.getFontSize(caption, width);
    const leftOffset = (width * (1 - this.boxWidth)) / 2;
    const bottomOffset = fontSize;
    const textBoxWidth = width * this.boxWidth;
    const textBoxHeight = height - bottomOffset;

    canvasTxt.font = 'fieriframes';
    canvasTxt.fontSize = fontSize;
    canvasTxt.vAlign = 'bottom';
    canvasTxt.lineHeight = this.lineHeight;
    canvasTxt.drawText(
      ctx,
      caption,
      leftOffset,
      0,
      textBoxWidth,
      textBoxHeight
    );

    const buffer = await sharp(frame.buffer)
      .composite([{ input: canvas.toBuffer() }])
      .removeAlpha()
      .toBuffer();

    frame.buffer = buffer;
  }
}

module.exports = FilterSimpleCaptions;
