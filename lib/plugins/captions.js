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

    return `-pointsize ${this.fontSize} -size ${width -
      100}x -gravity South -fill white -background none -undercolor 'rgba(0, 0, 0, 0.5)' caption:"${cleanCaption}" -geometry +0+20`;
  }

  getStillCmd(file, width, caption) {
    const cmdAnnotate = this.getCmdAnnotate(caption, width);
    return `convert "${file}" ${cmdAnnotate} -composite "${file}"`;
  }

  getGifCmd(file, frameCount, width, captions) {
    const ranges = chunk(range(0, frameCount), frameCount / this.numCaptions);

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

  addCaption(file) {
    const captions = this.getRandomCaptions(this.numCaptions);
    const { frameCount, width } = this.getImageInfo(file);

    const cmd =
      frameCount > 1
        ? this.getGifCmd(file, frameCount, width, captions)
        : this.getStillCmd(file, width, first(captions));

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

    const num = captionFiles.length;
    process.stdout.write('⏳ Captioning...');
    captionFiles.forEach((file, i) => {
      this.addCaption(file);
      process.stdout.clearLine();
      process.stdout.cursorTo(0);
      process.stdout.write(
        `⏳ Captioning, ${Math.ceil(((i + 1) / num) * 100)}%...`
      );
    });
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    console.log(`🏁 Captioned ${num} of ${files.length} files!`);
  }

  run(files) {
    this.addCaptions(files);
    return files;
  }
}

module.exports = CaptionsPlugin;
