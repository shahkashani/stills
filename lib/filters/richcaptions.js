const { existsSync, unlinkSync } = require('fs');
const { compact, range, sampleSize, sortBy } = require('lodash');
const { execCmd, getAsStills, mixImages } = require('./utils');
const stripTokens = require('../utils/strip-tokens');
const crypto = require('crypto');
const renderText = require('puppeteer-render-text');
const sharp = require('sharp');

sharp.cache(false);

class FilterCaptions {
  constructor({
    font,
    toCaptionText = [],
    toCaptionType = 'blink',
    toCaptionDuration = 8,
    glyphs = false
  } = {}) {
    this.font = font;
    this.glyphs = glyphs;
    this.toCaptionText = toCaptionText;
    this.toCaptionType = toCaptionType;
    this.toCaptionDuration = toCaptionDuration;
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

  md5(string) {
    return `${crypto.createHash('md5').update(string).digest('hex')}.png`;
  }

  getFontSize(width) {
    return Math.round(width / 22);
  }

  getWidth(width) {
    return Math.round(width * 0.7);
  }

  getCaptionType(files, type) {
    return type;
  }

  async getInstructions(useFiles, numFrames, captionType, duration) {
    const result = [];

    const files = [useFiles[0], ...useFiles, useFiles[0]];
    const type = this.getCaptionType(files, captionType);
    const rounds = files.length - 1;
    const chunkLength = Math.floor(numFrames / rounds);

    if (type === 'fade') {
      for (let i = 0; i < rounds; i++) {
        const image1 = files[i];
        const image2 = files[i + 1];
        for (let j = 0; j < chunkLength; j++) {
          const currentProgress = j / (chunkLength - 1);
          result.push({
            ...files[0],
            data: mixImages(image2.data, image1.data, currentProgress)
          });
        }
      }
    }

    if (type === 'blink') {
      const blinks = sortBy(
        sampleSize(range(numFrames / 4, numFrames), useFiles.length - 1)
      );
      for (let i = 0; i < numFrames; i++) {
        result.push(useFiles[0]);
      }
      for (let i = 0; i < useFiles.length - 1; i++) {
        result[blinks[i]] = useFiles[i + 1];
      }
    }
    return result;
  }

  async getCaptionFiles(captions, toCaptions, { width, fontSize }) {
    // @todo This needs to support multiple captions at some point
    const files = [];
    const text = captions.join(' ');
    const output = this.md5(text);
    const style = {
      fontSize,
      fontFamily: 'Arial',
      color: 'white',
      textAlign: 'center',
      textShadow: '1px 1px black'
    };
    await renderText({
      width,
      output,
      text,
      style
    });

    files.push({
      filename: output,
      ...(await sharp(output).raw().toBuffer({ resolveWithObject: true }))
    });

    if (toCaptions && toCaptions.length > 0) {
      for (const toCaption of toCaptions) {
        const toCaptionOutput = this.md5(toCaption);
        await renderText({
          width,
          style,
          output: toCaptionOutput,
          text: toCaption
        });
        files.push({
          filename: toCaptionOutput,
          ...(await sharp(toCaptionOutput)
            .raw()
            .toBuffer({ resolveWithObject: true }))
        });
      }
    }
    return files;
  }

  async apply(file, getImageInfo, index, _num, results) {
    const captions = this.getCurrentCaption(results, index);

    if (compact(captions).length === 0) {
      return;
    }

    const { width, numFrames } = getImageInfo(file);

    if (this.toCaptionText.length > 0 && numFrames < 2) {
      throw new Error('Cannot use toCaptionText with still.');
    }

    const fontSize = this.getFontSize(width);
    const files = await this.getCaptionFiles(captions, this.toCaptionText, {
      width: this.getWidth(width),
      fontSize
    });
    if (files.length > 1) {
      const instructions = await this.getInstructions(
        files,
        numFrames,
        this.toCaptionType,
        this.toCaptionDuration
      );
      const [stills, deleteFiles, collapse] = getAsStills(file);
      let index = 0;
      for (const still of stills) {
        const instruction = instructions[index];
        const png = await sharp(instruction.data, {
          raw: instruction.info
        })
          .extend({
            bottom: fontSize,
            background: { r: 0, g: 0, b: 0, alpha: 0 }
          })
          .png()
          .toBuffer();
        const buffer = await sharp(still)
          .composite([
            {
              input: png,
              gravity: 'south'
            }
          ])
          .toBuffer();
        sharp(buffer).toFile(still);
        index += 1;
      }
      collapse();
      deleteFiles();
    } else {
      execCmd(
        `convert "${file}" -coalesce null: \\( "${files[0].filename}" \\) -gravity south -geometry +0+${fontSize} -dither None -layers composite "${file}"`
      );
    }

    files.forEach((output) => unlinkSync(output.filename));

    if (this.glyphs && index === data.captions.length - 1) {
      data.captions = data.captions.map((d) =>
        d.map((c) => c.replace(/[^\s.\[\],-]/g, '?'))
      );
    }
    return captions;
  }
}

module.exports = FilterCaptions;
