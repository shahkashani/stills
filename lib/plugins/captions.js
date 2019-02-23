const parseSubs = require('parse-srt');
const glob = require('glob');
const { readFileSync } = require('fs');
const { map, sampleSize, chunk, range, first, last } = require('lodash');
const { exec } = require('shelljs');
const { extname } = require('path');

class CaptionsPlugin {
  constructor({ captionsFolder, minCaptions, numCaptions, fontSize }) {
    this.captions = this.loadCaptionFiles(captionsFolder);
    this.minCaptions = minCaptions;
    this.numCaptions = numCaptions || 1;
    this.fontSize = fontSize || 30;
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

  getRandomCaptions(num) {
    return sampleSize(this.captions, num);
  }

  getFrameCount(file) {
    const cmd = `identify -format "%n\n" "${file}" | head -1`;
    const result = exec(cmd, { silent: true });
    return result.code === 1 ? null : result.stdout;
  }

  getCmdAnnotate(caption) {
    const cleanCaption = caption.replace(/(["])/g, '\\$1');
    return `-pointsize ${
      this.fontSize
    } -gravity South -fill black -annotate +1+49 "${cleanCaption}" -fill white -annotate +0+50 "${cleanCaption}"`;
  }

  getStillCmd(file, caption) {
    return `convert "${file}" ${this.getCmdAnnotate(caption)} "${file}"`;
  }

  getGifCmd(file, captions) {
    const numFrames = this.getFrameCount(file);
    if (numFrames === 1) {
      console.log(`🐞 Not a GIF so can't add multiple captions: ${file}`);
      return this.getStillCmd(file, captions[0]);
    }
    const ranges = chunk(range(0, numFrames), numFrames / this.numCaptions);

    const cmdRanges = ranges
      .map((range, i) => {
        const start = first(range);
        const end = last(range);
        const caption = captions[i];
        return `\\( -clone ${start}-${end} ${this.getCmdAnnotate(caption)} \\)`;
      })
      .join(' ');

    return `convert "${file}" -coalesce ${cmdRanges} -delete 0-${numFrames -
      1} -layers OptimizeFrame "${file}"`;
  }

  addCaption(file) {
    const captions = this.getRandomCaptions(this.numCaptions);
    const cmd =
      this.numCaptions > 1
        ? this.getGifCmd(file, captions)
        : this.getStillCmd(file, first(captions));
    const result = exec(cmd, { silent: true });
    if (result.code === 1) {
      console.log(`🐞 Oops: ${cmd}`);
    }
  }

  addCaptions(files) {
    const captionFiles = sampleSize(
      files,
      Math.round(files.length * this.minCaptions)
    );
    captionFiles.forEach(file => {
      this.addCaption(file);
    });
    console.log(
      `📝 Captioned ${(captionFiles.length / files.length) * 100}% of files.`
    );
  }

  run(files) {
    this.addCaptions(files);
    return files;
  }
}

module.exports = CaptionsPlugin;
