const parseSubs = require('parse-srt');
const glob = require('glob');
const { readFileSync } = require('fs');
const { map, sampleSize } = require('lodash');
const { exec } = require('shelljs');

class CaptionsPlugin {
  constructor({ captionsFolder, minCaptions }) {
    this.captions = this.loadSubtitles(captionsFolder);
    this.minCaptions = minCaptions;
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

  loadSubtitles(folder) {
    return glob.sync(`${folder}/*.srt`).reduce((memo, file) => {
      const strings = this.loadSubtitle(file);
      if (Array.isArray(strings)) {
        memo.push.apply(memo, strings);
      } else {
        console.log(`Something went wrong with reading file ${file}`);
      }
      return memo;
    }, []);
  }

  getRandomCaption() {
    return this.captions[Math.floor(Math.random() * this.captions.length)];
  }

  addCaption(file) {
    const caption = this.getRandomCaption();
    const cmd = `convert "${file}" -pointsize 30 -gravity South -fill black -annotate +1+49 "${caption}" -fill white -annotate +0+50 "${caption}" "${file}"`;
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
