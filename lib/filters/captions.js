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
  constructor({ folder, num }) {
    this.captions = this.loadCaptionFiles(folder);
    this.num = num;
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
    if (result.code === 1) {
      return null;
    }
    const [frameCount, width] = result.stdout.trim().split(':');

    return { frameCount: parseInt(frameCount, 10), width: parseInt(width, 10) };
  }

  getCmdAnnotate(caption, width) {
    const cleanCaption = (caption || '').replace(/(["])/g, '\\$1');
    const fontSize = width / 20;
    const boxWidth = width * 0.8;
    const padding = fontSize;

    return `-pointsize ${fontSize} -size ${boxWidth}x -gravity South -fill white -background none -undercolor 'rgba(0, 0, 0, 0.5)' caption:"${cleanCaption}" -geometry +0+${padding}`;
  }

  getStillCmd(file, width, caption) {
    const cmdAnnotate = this.getCmdAnnotate(caption, width);
    return `convert "${file}" ${cmdAnnotate} -composite "${file}"`;
  }

  getGifCmd(file, frameCount, numCaptions, width, captions) {
    const ranges = chunk(range(0, frameCount), frameCount / numCaptions);

    const cmdRanges = ranges
      .map((range, i) => {
        const start = first(range);
        const end = last(range);
        const caption = captions[i];
        const cmdAnnotate = this.getCmdAnnotate(caption, width);
        return `\\( -clone ${start}-${end} -coalesce null: ${cmdAnnotate} -layers composite \\)`;
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
    if (result.code === 1) {
      console.log(`🐞 Oops: ${cmd}`);
    }
  }
}

module.exports = FilterCaptions;
