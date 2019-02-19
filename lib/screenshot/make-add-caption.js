const glob = require('glob');
const fs = require('fs');
const parseSRT = require('parse-srt');
const _ = require('lodash');
const shell = require('shelljs');

const loadCaptionFile = file => {
  const data = fs.readFileSync(file, 'UTF-8').toString();
  const srt = parseSRT(data);
  return _.map(srt, 'text').map(str =>
    str
      .trim()
      .replace('<br />', '\\n')
      .replace(/<(?:.|\n)*?>/gm, '')
      .replace(/\s{2,}/g, ' ')
  );
};

const loadCaptionFiles = folder => {
  const files = glob.sync(`${folder}/*.srt`);
  return files.reduce((memo, file) => {
    const strings = loadCaptionFile(file);
    if (Array.isArray(strings)) {
      memo.push.apply(memo, strings);
    } else {
      console.log('Something went wrong with reading file:', file);
    }
    return memo;
  }, []);
};

const addCaption = (options, captions, files) => {
  const { minPercentCaptions } = options;
  let num = 0;
  files.forEach(file => {
    if (Math.random() >= minPercentCaptions / 100) {
      return;
    }
    const caption = captions[
      Math.floor(Math.random() * captions.length)
    ].replace(/(["])/g, /\\$1/);
    const cmd = `convert "${file}" -pointsize 30 -gravity South -fill black -annotate +1+49 "${caption}" -fill white -annotate +0+50 "${caption}" "${file}"`;
    const result = shell.exec(cmd, { silent: true });
    if (result.code === 1) {
      console.log(`🐞 Oops: ${cmd}`);
    } else {
      num++;
    }
  });
  console.log(`📝 Captioned ${(num / files.length) * 100}% of files.`);
  return files;
};

module.exports = options => {
  const captions = loadCaptionFiles(options.captionsFolder);
  return files => addCaption(options, captions, files);
};
