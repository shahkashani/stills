const parseSubs = require('parse-srt');
const glob = require('glob');
const { readFileSync, existsSync } = require('fs');
const { map, sampleSize, sample, first, random } = require('lodash');
const { exec } = require('shelljs');
const { extname, basename } = require('path');
const { getImageInfo } = require('./utils');

const TOTALLY_ARBITRARY_IDEAL_LINE_LENGTH = 42;

class FilterCaptions {
  constructor({
    folder,
    num,
    font,
    background,
    isSequential,
    captionFileGlob = '*.{srt,txt}'
  }) {
    this.num = num;
    this.font = font;
    this.background = background;
    this.isSequential = !!isSequential;
    this.captionFileGlob = captionFileGlob;

    const {
      captions,
      captionFile,
      captionFileType
    } = this.loadRandomCaptionFile(folder);

    this.captions = captions;
    this.captionFile = basename(captionFile);
    this.captionFileType = captionFileType;

    if (this.font && !existsSync(this.font)) {
      console.log(`🐞 Yo, this font does not exist: ${this.font}`);
    }
  }

  get name() {
    return 'captions';
  }

  loadSubtitle(file) {
    const data = readFileSync(file, 'UTF-8').toString();

    try {
      const srt = parseSubs(data);
      return map(srt, 'text').map(str =>
        str
          .replace('<br />', '\n')
          .replace(/<(?:.|\n)*?>/gm, ' ')
          .replace(/\s{2,}/g, ' ')
          .trim()
      );
    } catch (err) {
      console.log(`🐞 Could not load subtitle: ${file}: `, err);
      return [];
    }
  }

  loadTextFile(file) {
    const lines = readFileSync(file, 'UTF-8')
      .toString()
      .replace('\r\n', '\n')
      .replace('\r', '\n')
      .split('\n');
    return lines.filter(line => line.trim() !== '');
  }

  loadRandomCaptionFile(folder) {
    const captionFile = sample(glob.sync(`${folder}/${this.captionFileGlob}`));
    const captionFileType = extname(captionFile).slice(1);
    let captions;

    switch (captionFileType) {
      case 'srt':
        captions = this.loadSubtitle(captionFile);
        break;
      case 'txt':
        captions = this.loadTextFile(captionFile);
        break;
      default:
        console.log(`Not sure how to parse the file ${captionFile}`);
        captions = [];
        break;
    }

    return {
      captions,
      captionFile,
      captionFileType
    };
  }

  getLongestLineLength(captions) {
    return captions
      .reduce((memo, caption) => {
        return [...memo, ...caption.split(/\n/)];
      }, [])
      .reduce(
        (memo, caption) => (caption.length > memo ? caption.length : memo),
        0
      );
  }

  wrapCaption(fullCaption) {
    if (
      this.getLongestLineLength([fullCaption]) <
      TOTALLY_ARBITRARY_IDEAL_LINE_LENGTH
    ) {
      return fullCaption;
    }
    const caption = fullCaption.replace(/\n/g, ' ');
    const splitIndex = caption
      .split(' ')
      .reduce(
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

  getFontSize(width, captions) {
    const longestCaptionLength = this.getLongestLineLength(captions);
    const captionFactor = Math.min(
      1,
      TOTALLY_ARBITRARY_IDEAL_LINE_LENGTH / longestCaptionLength
    );
    // This whole thing is stupid, but I'm too lazy to figure out a better way to do this.
    // I really should just use imagemagick to calculate this. Maybe one day.
    return (width / 20) * captionFactor;
  }

  getCmdText({
    caption,
    width,
    fontSize,
    color,
    background = 'none',
    offset = 0
  }) {
    const cleanCaption = (caption || '').replace(/(["])/g, '\\$1');
    const boxWidth = width * 0.9;
    const padding = fontSize;
    const fontCmd = this.font ? `-font "${this.font}"` : '';
    const offsetX = offset;
    const offsetY = padding - offset;

    return `-pointsize ${fontSize} ${fontCmd} -size ${boxWidth}x -gravity South -fill ${color} -background none -undercolor '${background}' caption:"${cleanCaption}" -geometry +${offsetX}+${offsetY}`;
  }

  getStillCmd(file, width, fullCaption) {
    const background = this.background;
    const caption = this.wrapCaption(fullCaption);
    const fontSize = this.getFontSize(width, [caption]);

    if (background) {
      const cmdText = this.getCmdText({
        caption,
        width,
        color: 'white',
        background
      });
      return `convert "${file}" ${cmdText} -composite "${file}"`;
    } else {
      const cmdBlackText = this.getCmdText({
        fontSize,
        caption,
        width,
        color: 'black',
        offset: 1
      });
      const cmdWhiteText = this.getCmdText({
        fontSize,
        caption,
        width,
        color: 'white'
      });
      return `convert "${file}" ${cmdBlackText} -composite ${cmdWhiteText} -composite "${file}"`;
    }
  }

  getGifCmd(file, width, fullCaptions, numFrames) {
    const captions = fullCaptions.map(caption => this.wrapCaption(caption));
    const numCaptions = captions.length;
    const frameIncr = Math.floor(numFrames / numCaptions);
    const background = this.background;
    const numFrameLeftovers = numFrames - frameIncr * numCaptions;
    const fontSize = this.getFontSize(width, captions);

    const cmdRanges = captions
      .map((caption, i) => {
        const numLeftovers = i === numCaptions - 1 ? numFrameLeftovers : 0;
        const startFrame = i * frameIncr;
        const endFrame = startFrame + frameIncr - 1 + numLeftovers;

        if (background) {
          const cmdText = this.getCmdText({
            fontSize,
            caption,
            width,
            color: 'white',
            background
          });
          return `\\( -clone ${startFrame}-${endFrame} -coalesce null: ${cmdText} -layers composite \\)`;
        } else {
          const cmdBlackText = this.getCmdText({
            fontSize,
            caption,
            width,
            color: 'black',
            offset: 1
          });
          const cmdWhiteText = this.getCmdText({
            fontSize,
            caption,
            width,
            color: 'white'
          });
          return `\\( -clone ${startFrame}-${endFrame} -coalesce null: ${cmdBlackText} -layers composite -coalesce null: ${cmdWhiteText} -layers composite \\)`;
        }
      })
      .join(' ');

    return `convert "${file}" ${cmdRanges} -delete 0-${numFrames -
      1} "${file}"`;
  }

  getCaptions(num, isSequential) {
    if (isSequential) {
      const upperBound = Math.max(0, this.captions.length - num);
      const index = random(0, upperBound);
      return this.captions.slice(index, index + num);
    } else {
      return sampleSize(this.captions, num);
    }
  }

  getSentenceCaptions(num, isSequential, maxTries = 100) {
    let isValid = false;
    let captions = [];
    for (let i = 0; i < maxTries && !isValid; i++) {
      captions = this.getCaptions(num, isSequential);
      isValid = captions.length > 0 && !first(captions).match(/^[a-z]/);
    }
    return captions;
  }

  getNumCaptions(num, numFrames, captionFileType) {
    if (Number.isFinite(num)) {
      return Math.min(numFrames, num);
    }
    if (
      typeof num === 'object' &&
      captionFileType in num &&
      Number.isFinite(num[captionFileType])
    ) {
      return Math.min(num[captionFileType], numFrames);
    } else {
      console.log(
        `🐞 Could not pick caption count from: `,
        captionFileType,
        num
      );
    }
    return 1;
  }

  apply(file) {
    const { numFrames, width } = getImageInfo(file);
    const numCaptions = this.getNumCaptions(
      this.num,
      numFrames,
      this.captionFileType
    );
    const captions = this.getSentenceCaptions(numCaptions, this.isSequential);
    console.log(`📙 Picking ${numCaptions} from ${this.captionFile}`);

    if (captions.length === 0) {
      console.log(`🐞 Could not load any captions.`);
      return;
    }

    const cmd =
      numFrames > 1
        ? this.getGifCmd(file, width, captions, numFrames)
        : this.getStillCmd(file, width, first(captions));

    const result = exec(cmd, { silent: true });
    if (result.code !== 0) {
      console.log(`🐞 Oops: ${result.stderr}\n> ${cmd}`);
    }

    return captions;
  }
}

module.exports = FilterCaptions;
