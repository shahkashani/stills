const parseSubs = require('parse-srt');
const glob = require('glob');
const { readFileSync, existsSync } = require('fs');
const { map, sampleSize, sample, first, random } = require('lodash');
const { exec } = require('shelljs');
const { extname, basename } = require('path');
const { getImageInfo, execCmd, parseImageMagickMetrics } = require('./utils');

const captionTransformations = {
  uppercase: captions => captions.map(c => c.toUpperCase()),
  music: captions => captions.map(c => `♪ ${c.replace(/\./g, '')} ♪`),
  exclamation: captions =>
    captions.map(text => {
      const transformMap = { ' ': true, '\n': true };
      return String.fromCharCode(
        ...Array.from(text).map(character => {
          const charCode = character.charCodeAt(0);
          if (!(character in transformMap)) {
            transformMap[character] = Math.random() > 0.85;
          }
          return charCode + (transformMap[character] ? 1 : 0);
        })
      ).toUpperCase();
    })
};

class FilterCaptions {
  constructor({
    folder,
    num,
    font,
    background,
    isSequential,
    captionFileGlob = '*.{srt,txt}',
    transformations = []
  }) {
    this.num = num;
    this.font = font;
    this.background = background;
    this.isSequential = !!isSequential;
    this.captionFileGlob = captionFileGlob;
    this.applyTransformations = transformations.reduce((memo, key) => {
      const method = captionTransformations[key];
      if (method) {
        memo.push(method);
      }
      return memo;
    }, []);

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
          .replace(/<(?:.|\n)*?>/gm, '')
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

  wrapCaption(fullCaption) {
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
      `🤔 Was expecting ${numExpectedLines} lines, but got ${
        metrics.length
      }. Wrapping.`
    );
    const wrappedCaption = this.wrapCaption(caption);
    const wrappedCaptionMetrics = this.getFontMetrics(wrappedCaption, width);
    if (wrappedCaptionMetrics.length > 2) {
      console.log(
        `🤔 Wrapped lines exceed 2 (${
          wrappedCaptionMetrics.length
        }). Giving up.`
      );
      console.log(wrappedCaptionMetrics);
      // At this point we kinda just give up and let Imagemagick wrap as it best sees fit
      return caption.replace(/\n/g, ' ').replace(/\s{2,}/g, ' ');
    }
    return wrappedCaption;
  }

  getCmdText({
    caption,
    width,
    color = 'black',
    background = 'none',
    offset = 0
  }) {
    const cleanCaption = (caption || '').replace(/(["-])/g, '\\$1');
    const boxWidth = width * 0.8;
    const fontSize = width / 20;
    const padding = fontSize;
    const fontCmd = this.font ? `-font "${this.font}"` : '';
    const offsetX = offset;
    const offsetY = padding - offset;
    return `-pointsize ${fontSize} ${fontCmd} -size ${boxWidth}x -gravity South -fill ${color} -background none -undercolor '${background}' caption:"${cleanCaption}" -geometry +${offsetX}+${offsetY}`;
  }

  getStillCmd(file, fullCaption, width) {
    const background = this.background;
    const caption = this.getSmartWrappedCaption(fullCaption, width);

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
        caption,
        width,
        color: 'black',
        offset: 1
      });
      const cmdWhiteText = this.getCmdText({
        caption,
        width,
        color: 'white'
      });
      return `convert "${file}" ${cmdBlackText} -composite ${cmdWhiteText} -composite "${file}"`;
    }
  }

  getGifCmd(file, captions, width, numFrames) {
    const numCaptions = captions.length;
    const frameIncr = Math.floor(numFrames / numCaptions);
    const background = this.background;
    const numFrameLeftovers = numFrames - frameIncr * numCaptions;

    const cmdRanges = captions
      .map((fullCaption, i) => {
        const caption = this.getSmartWrappedCaption(fullCaption, width);
        const numLeftovers = i === numCaptions - 1 ? numFrameLeftovers : 0;
        const startFrame = i * frameIncr;
        const endFrame = startFrame + frameIncr - 1 + numLeftovers;

        if (background) {
          const cmdText = this.getCmdText({
            caption,
            width,
            color: 'white',
            background
          });
          return `\\( -clone ${startFrame}-${endFrame} -coalesce null: ${cmdText} -layers composite \\)`;
        } else {
          const cmdBlackText = this.getCmdText({
            caption,
            width,
            color: 'black',
            offset: 1
          });
          const cmdWhiteText = this.getCmdText({
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
    let captions = this.getSentenceCaptions(numCaptions, this.isSequential);
    console.log(`📙 Picking ${numCaptions} from ${this.captionFile}`);

    if (captions.length === 0) {
      console.log(`🐞 Could not load any captions.`);
      return;
    }

    this.applyTransformations.forEach(transformation => {
      captions = transformation(captions);
    });

    const cmd =
      numFrames > 1
        ? this.getGifCmd(file, captions, width, numFrames)
        : this.getStillCmd(file, first(captions), width);

    const result = exec(cmd, { silent: true });
    if (result.code !== 0) {
      console.log(`🐞 Oops: ${result.stderr}\n> ${cmd}`);
    }

    return captions;
  }
}

module.exports = FilterCaptions;
