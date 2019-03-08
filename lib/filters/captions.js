const parseSubs = require('parse-srt');
const glob = require('glob');
const { readFileSync, existsSync } = require('fs');
const {
  map,
  sampleSize,
  chunk,
  range,
  first,
  last,
  random
} = require('lodash');
const { exec } = require('shelljs');
const { extname } = require('path');
const { getImageInfo } = require('./utils');

class FilterCaptions {
  constructor({ folder, num, font, background, isSequential }) {
    this.captions = this.loadCaptionFiles(folder);
    this.num = num;
    this.font = font;
    this.background = background;
    this.isSequential = !!isSequential;

    if (this.font && !existsSync(this.font)) {
      console.log(`🐞 Yo, this font does not exist: ${this.font}`);
    }
  }

  get name() {
    return 'captions';
  }

  loadSubtitle(file) {
    const data = readFileSync(file, 'UTF-8').toString();
    const srt = parseSubs(data);
    return map(srt, 'text').map(str =>
      str
        .replace('<br />', '\n')
        .replace(/<(?:.|\n)*?>/gm, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim()
    );
  }

  loadTextFile(file) {
    const lines = readFileSync(file, 'UTF-8')
      .toString()
      .replace('\r\n', '\n')
      .replace('\r', '\n')
      .split('\n');
    return lines.filter(line => line.trim() !== '');
  }

  loadCaptionFiles(folder) {
    return glob.sync(`${folder}/*.{srt,txt}`).reduce((memo, file) => {
      let strings;
      switch (extname(file)) {
        case '.srt':
          strings = this.loadSubtitle(file);
          break;
        case '.txt':
          strings = this.loadTextFile(file);
          break;
        default:
          console.log(`Not sure how to parse the file ${file}`);
      }

      if (Array.isArray(strings)) {
        memo.push.apply(memo, strings);
      } else {
        console.log(`Something went wrong with reading file ${file}`);
      }
      return memo;
    }, []);
  }

  getCmdText({ caption, width, color, background = 'none', offset = 0 }) {
    const cleanCaption = (caption || '').replace(/(["])/g, '\\$1');
    const fontSize = width / 20;
    const boxWidth = width * 0.8;
    const padding = fontSize;
    const fontCmd = this.font ? `-font "${this.font}"` : '';
    const offsetX = offset;
    const offsetY = padding - offset;

    return `-pointsize ${fontSize} ${fontCmd} -size ${boxWidth}x -gravity South -fill ${color} -background none -undercolor '${background}' caption:"${cleanCaption}" -geometry +${offsetX}+${offsetY}`;
  }

  getStillCmd(file, width, caption) {
    const background = this.background;
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

  getGifCmd(file, width, captions, frameCount) {
    const numCaptions = captions.length;
    const frameIncr = Math.floor(frameCount / numCaptions);
    const background = this.background;
    const numLeftovers = frameCount - frameIncr * numCaptions;

    const cmdRanges = captions
      .map((caption, i) => {
        const isLastRun = i === numCaptions - 1;
        const startFrame = i * frameIncr;
        const endFrame =
          (i + 1) * frameIncr - 1 + (isLastRun ? numLeftovers : 0);

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

    return `convert "${file}" ${cmdRanges} -delete 0-${frameCount -
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

  apply(file) {
    const numCaptions = this.num ? this.num : random(1, 2);
    const captions = this.getSentenceCaptions(numCaptions, this.isSequential);

    if (captions.length === 0) {
      console.log(`🐞 Could not load any captions.`);
      return;
    }

    const { frameCount, width } = getImageInfo(file);

    const cmd =
      frameCount > 1
        ? this.getGifCmd(file, width, captions, frameCount)
        : this.getStillCmd(file, width, first(captions));

    const result = exec(cmd, { silent: true });
    if (result.code !== 0) {
      console.log(`🐞 Oops: ${result.stderr}\n> ${cmd}`);
    }
  }
}

module.exports = FilterCaptions;
