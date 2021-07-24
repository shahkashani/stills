const { existsSync, unlinkSync } = require('fs');
const { compact } = require('lodash');
const { execCmd } = require('./utils');
const stripTokens = require('../utils/strip-tokens');
const crypto = require('crypto');
const renderText = require('puppeteer-render-text');

class FilterCaptions {
  constructor({ font, glyphs = false } = {}) {
    this.font = font;
    this.glyphs = glyphs;
    if (this.font && !existsSync(this.font)) {
      console.log(`🐞 Yo, this font does not exist: ${this.font}`);
    }
  }

  get name() {
    return 'rich-captions';
  }

  getCurrentCaption(results, index) {
    return (
      (results.captions || {})[index] ||
      [].map((c) => stripTokens(c).replace(/‐/g, '-'))
    );
  }

  getOutputName(file, index) {
    return `${crypto
      .createHash('md5')
      .update(`caption-${file}-${index}`)
      .digest('hex')}.png`;
  }

  getFontSize(width) {
    return Math.round(width / 22);
  }

  getWidth(width) {
    return Math.round(width * 0.7);
  }

  async createCaptionFile(captions, output, { width, fontSize }) {
    await renderText({
      output,
      width,
      text: captions.join(' '),
      style: {
        fontSize,
        fontFamily: 'Arial',
        color: 'white',
        textAlign: 'center',
        textShadow: '1px 1px black'
      }
    });
  }

  async apply(file, getImageInfo, index, _num, results) {
    const captions = this.getCurrentCaption(results, index);
    const output = this.getOutputName(file, index);

    if (compact(captions).length === 0) {
      return;
    }

    const imageInfo = getImageInfo(file);
    const { width } = imageInfo;

    const fontSize = this.getFontSize(width);
    await this.createCaptionFile(captions, output, {
      width: this.getWidth(width),
      fontSize
    });

    execCmd(
      `convert "${file}" -coalesce null: \\( "${output}" \\) -gravity south -geometry +0+${fontSize} -dither None -layers composite "${file}"`
    );

    unlinkSync(output);

    if (this.glyphs && index === data.captions.length - 1) {
      data.captions = data.captions.map((d) =>
        d.map((c) => c.replace(/[^\s.\[\],-]/g, '?'))
      );
    }
    return captions;
  }
}

module.exports = FilterCaptions;
