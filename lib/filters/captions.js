const parseSubs = require('parse-srt');
const glob = require('glob');
const { readFileSync } = require('fs');
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

class FilterCaptions {
  constructor({ folder, num, font, bgColor }) {
    this.captions = this.loadCaptionFiles(folder);
    this.num = num;
    this.font = font;
    this.bgColor = bgColor;
  }

  get name() {
    return 'captions';
  }

  loadSubtitle(file) {
    const data = readFileSync(file, 'UTF-8').toString();
    const srt = parseSubs(data);
    return map(srt, 'text').map(str =>
      str
        .trim()
        .replace('<br />', '\\n')
        .replace(/<(?:.|\n)*?>/gm, '')
        .replace(/\s{2,}/g, ' ')
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

  getImageInfo(file) {
    const cmd = `identify -format "%n:%w\n" "${file}" | head -1`;
    const result = exec(cmd, { silent: true });
    if (result.code !== 0) {
      return null;
    }
    const [frameCount, width] = result.stdout.trim().split(':');

    return { frameCount: parseInt(frameCount, 10), width: parseInt(width, 10) };
  }

  getCmdText({ caption, width, color, bgColor = 'none', offset = 0 }) {
    const cleanCaption = (caption || '').replace(/(["])/g, '\\$1');
    const fontSize = width / 20;
    const boxWidth = width * 0.8;
    const padding = fontSize;
    const fontCmd = this.font ? `-font "${this.font}"` : '';
    const offsetX = offset;
    const offsetY = padding - offset;

    return `-pointsize ${fontSize} ${fontCmd} -size ${boxWidth}x -gravity South -fill ${color} -background none -undercolor '${bgColor}' caption:"${cleanCaption}" -geometry +${offsetX}+${offsetY}`;
  }

  getStillCmd(file, width, caption) {
    if (this.bgColor) {
      const cmdText = this.getCmdText({
        caption,
        width,
        color: 'white',
        bgColor: this.bgColor
      });
      return `convert "${file}" ${cmdText} -composite "${file}"`;
    } else {
      const cmdBlackText = this.getCmdText({
        caption,
        width,
        color: 'black',
        offset: 2
      });
      const cmdWhiteText = this.getCmdText({
        caption,
        width,
        color: 'white',
        bgColor: this.bgColor
      });
      return `convert "${file}" ${cmdBlackText} -composite ${cmdWhiteText} -composite "${file}"`;
    }
  }

  getGifCmd(file, frameCount, numCaptions, width, captions) {
    const ranges = chunk(range(0, frameCount), frameCount / numCaptions);

    const cmdRanges = ranges
      .map((range, i) => {
        const start = first(range);
        const end = last(range);
        const caption = captions[i];
        if (this.bgColor) {
          const cmdText = this.getCmdText({
            caption,
            width,
            color: 'white',
            bgColor: this.bgColor
          });
          return `\\( -clone ${start}-${end} -coalesce null: ${cmdText} -layers composite \\)`;
        } else {
          const cmdBlackText = this.getCmdText({
            caption,
            width,
            color: 'black',
            offset: 2
          });
          const cmdWhiteText = this.getCmdText({
            caption,
            width,
            color: 'white'
          });
          return `\\( -clone ${start}-${end} -coalesce null: ${cmdBlackText} -layers composite -coalesce null: ${cmdWhiteText} -layers composite \\)`;
        }
      })
      .join(' ');

    return `convert "${file}" ${cmdRanges} -delete 0-${frameCount -
      1} "${file}"`;
  }

  apply(file) {
    const numCaptions = this.num ? this.num : random(1, 2);
    const captions = sampleSize(this.captions, numCaptions);
    const { frameCount, width } = this.getImageInfo(file);

    const cmd =
      frameCount > 1
        ? this.getGifCmd(file, frameCount, numCaptions, width, captions)
        : this.getStillCmd(file, width, first(captions));

    const result = exec(cmd, { silent: true });
    if (result.code !== 0) {
      console.log(`🐞 Oops: ${result.stderr}\n> ${cmd}`);
    }
  }
}

module.exports = FilterCaptions;
