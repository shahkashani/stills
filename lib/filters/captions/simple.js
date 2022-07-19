const { existsSync } = require('fs');
const { exec } = require('shelljs');
const { execCmd, parseImageMagickMetrics } = require('../utils');
const isUppercasy = require('../../utils/is-uppercasy');

class FilterSimpleCaptions {
  constructor({
    font = './fonts/arial.ttf',
    glyphs = false,
    shadowOffset = 1,
    lineHeight = 0,
    paddingFactor = 1,
    boxWidth = 0.8,
    fontSize = 1,
    isGlow = false,
    color = 'white'
  } = {}) {
    this.font = font;
    this.shadowOffset = shadowOffset;
    this.glyphs = glyphs;
    this.paddingFactor = paddingFactor;
    this.lineHeight = lineHeight;
    this.color = color;
    this.isGlow = isGlow;
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
    });
    const cmd = `convert -debug annotate -log "%e" ${cmdText} 2>&1 | grep -i Metrics:`;
    const output = execCmd(cmd);
    return parseImageMagickMetrics(output);
  }

  // Captions that wrap over more lines than expected get formatted into prettier centered captions
  getSmartWrappedCaption(caption, width) {
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
    const fontCmd = this.font ? `-font "${this.font}"` : '';
    const offsetX = offset;
    const offsetY = padding - offset;
    const lineHeightCmd = this.lineHeight
      ? `-interline-spacing ${fontSize * this.lineHeight}`
      : '';
    return `-pointsize ${fontSize} ${fontCmd} -size ${boxWidth}x -gravity South -fill "${color}" ${lineHeightCmd} -background none caption:"${cleanCaption}" -geometry +${offsetX}+${offsetY}`;
  }

  getCmd(file, fullCaption, width) {
    const caption = this.getSmartWrappedCaption(fullCaption, width);
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
    return `convert "${file}" ${cmdBlackText} -composite ${cmdWhiteText} -composite -dither None "${file}"`;
  }

  getGlow(file, fullCaption, width) {
    const caption = this.getSmartWrappedCaption(fullCaption, width);
    const fontSize = this.getFontSize(caption, width);
    const blur = `-blur 0x${fontSize / 10}`;
    const cmdWhiteText = this.getCmdText({
      caption,
      width,
      color: this.color
    });
    return `convert "${file}" \\( ${cmdWhiteText} ${blur} \\) -composite -dither None "${file}"`;
  }

  async apply(frame, text, { image }) {
    const file = frame.file;
    const { width } = image.getInfo();

    if (!text) {
      return;
    }
    const caption = text.replace(/\*/g, '').replace(/‐/g, '-');
    if (this.isGlow) {
      await execCmd(this.getGlow(file, caption, width));
    }
    await execCmd(this.getCmd(file, caption, width));
  }
}

module.exports = FilterSimpleCaptions;
