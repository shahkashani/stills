const parseSubs = require('parse-srt');
const glob = require('glob');
const { readFileSync } = require('fs');
const pdf = require('pdf-parse');
const { map, sampleSize, sample, first, random } = require('lodash');
const { extname, basename } = require('path');
const replaceUser = require('./utils/replace-user');
const tokenizer = require('sbd');

const captionTransformations = {
  uppercase: (captions) => captions.map((c) => c.toUpperCase()),
  music: (captions) => captions.map((c) => `♪ ${c.replace(/\./g, '')} ♪`),
  exclamation: (captions) =>
    captions.map((text) => {
      const transformMap = { ' ': true, '\n': true };
      return String.fromCharCode(
        ...Array.from(text).map((character) => {
          const charCode = character.charCodeAt(0);
          if (!(character in transformMap)) {
            transformMap[character] = Math.random() > 0.85;
          }
          return charCode + (transformMap[character] ? 1 : 0);
        })
      ).toUpperCase();
    })
};

class GlobalsCaptions {
  constructor({
    folder,
    num,
    isSequential,
    captionStart,
    captionEnd,
    captionFileGlob = '*.{srt,txt,pdf}',
    transformations = [],
    captionText = null,
    pdfSentenceMaxLength = 75,
    pdfSentenceMinLength = 3
  } = {}) {
    this.num = num;
    this.folder = folder;
    this.isSequential = !!isSequential;
    this.captionFileGlob = captionFileGlob;
    this.captionStart = captionStart;
    this.captionEnd = captionEnd;
    this.captionText = captionText;
    this.pdfSentenceMaxLength = pdfSentenceMaxLength;
    this.pdfSentenceMinLength = pdfSentenceMinLength;
    this.applyTransformations = transformations.reduce((memo, key) => {
      if (typeof key === 'function') {
        memo.push(key);
      } else {
        const method = captionTransformations[key];
        if (method) {
          memo.push(method);
        }
      }
      return memo;
    }, []);
  }

  async loadCaptions() {
    const {
      captions,
      captionFile,
      captionFileType
    } = await this.loadRandomCaptionFile(this.folder);

    this.captions = captions;
    this.captionFile = basename(captionFile);
    this.captionFileType = captionFileType;

    if (
      Number.isFinite(this.captionStart) &&
      Number.isFinite(this.captionEnd) &&
      this.captionEnd <= this.captionStart
    ) {
      throw new Error('Caption start must be smaller than caption end');
    }
  }

  get name() {
    return 'captions';
  }

  loadSubtitle(file) {
    const data = readFileSync(file, 'UTF-8').toString();

    try {
      const srt = parseSubs(data);
      return map(srt, 'text').map((str) =>
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

  async loadPDF(file) {
    const string = readFileSync(file);
    const { text } = await pdf(string);
    const sentences = tokenizer.sentences(text);
    const shortishSentences = sentences.filter(
      (sentence) =>
        sentence.length < this.pdfSentenceMaxLength &&
        sentence.length >= this.pdfSentenceMinLength
    );
    const cleanSentences = shortishSentences.map((sentence) =>
      sentence
        .replace(/[\n\r]/g, ' ')
        .replace(/\u200B/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim()
    );
    return cleanSentences;
  }

  loadTextFile(file) {
    const lines = readFileSync(file, 'UTF-8')
      .toString()
      .replace('\r\n', '\n')
      .replace('\r', '\n')
      .split('\n');
    return lines.filter((line) => line.trim() !== '');
  }

  async loadRandomCaptionFile(folder) {
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
      case 'pdf':
        captions = await this.loadPDF(captionFile);
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

  getCaptions(num, isSequential) {
    if (this.captionText && this.captionText.length > 0) {
      return this.captionText;
    }
    let captions = this.captions;
    if (
      Number.isFinite(this.captionStart) &&
      Number.isFinite(this.captionEnd)
    ) {
      const startIndex = Math.floor(
        (this.captions.length * this.captionStart) / 100
      );
      const endIndex = Math.floor(
        (this.captions.length * this.captionEnd) / 100
      );
      captions = captions.slice(startIndex, endIndex);
      console.log(
        `📙 Restricting to ${captions.length} captions (${startIndex}-${endIndex})`
      );
    } else if (Number.isFinite(this.captionStart)) {
      const startIndex = Math.floor(
        (this.captions.length * this.captionStart) / 100
      );
      captions = captions.slice(startIndex);
      console.log(
        `📙 Restricting to ${captions.length} captions (${startIndex})`
      );
    }

    if (isSequential) {
      const upperBound = Math.max(0, captions.length - num);
      const index = random(0, upperBound);
      return captions.slice(index, index + num);
    } else {
      return sampleSize(captions, num);
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

  async get(files, getImageInfo, globals) {
    await this.loadCaptions();

    let totalCaptions = 0;
    const counts = [];

    for (const file of files) {
      const { numFrames } = getImageInfo(file);
      const numCaptions = this.getNumCaptions(
        this.num,
        numFrames,
        this.captionFileType
      );
      counts.push(numCaptions);
      totalCaptions += numCaptions;
    }

    let captions = this.getSentenceCaptions(totalCaptions, this.isSequential);

    console.log(`📙 Picking ${totalCaptions} from ${this.captionFile}`);

    if (globals && globals.user) {
      console.log(`📙 Adding user ${globals.user.name}`);
      captions = replaceUser(captions, globals.user.name);
    }

    for (let transformation of this.applyTransformations) {
      captions = await transformation(captions);
    }

    const groups = [];
    let currentIndex = 0;
    for (const count of counts) {
      groups.push(captions.slice(currentIndex, currentIndex + count));
      currentIndex += count;
    }
    console.log(groups);
    return groups;
  }
}

module.exports = GlobalsCaptions;
