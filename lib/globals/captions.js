const parseSubs = require('parse-srt');
const glob = require('glob');
const { readFileSync } = require('fs');
const pdf = require('pdf-parse');
const { map, sample, first, random, countBy } = require('lodash');
const { extname, basename } = require('path');
const replaceUser = require('./utils/replace-user');
const tokenizer = require('sbd');

class GlobalsCaptions {
  constructor({
    folder,
    num,
    captionFileGlob = '*.{srt,txt,pdf}',
    captionText = null,
    pdfSentenceMaxLength = 75,
    pdfSentenceMinLength = 3,
    transformationRate = 0,
    applySameTransform = false,
    banned = []
  } = {}) {
    this.num = num;
    this.folder = folder;
    this.captionFileGlob = captionFileGlob;
    this.captionText = captionText;
    this.pdfSentenceMaxLength = pdfSentenceMaxLength;
    this.pdfSentenceMinLength = pdfSentenceMinLength;
    this.transformationRate = transformationRate;
    this.applySameTransform = applySameTransform;
    this.banned = banned;
    this.transformations = {
      uppercase: (caption) => caption.toUpperCase(),
      music: (caption) => `♪ ${caption.replace(/\./g, '')} ♪`,
      exclamation: (caption) => {
        const cleanCaption = caption
          .replace(/[\n\r]/g, ' ')
          .replace(/\s{2,}/g, ' ');
        const transformMap = { ' ': true };
        return String.fromCharCode(
          ...Array.from(cleanCaption).map((character) => {
            const charCode = character.charCodeAt(0);
            if (!(character in transformMap)) {
              transformMap[character] = Math.random() > 0.85;
            }
            return charCode + (transformMap[character] ? 1 : 0);
          })
        ).toUpperCase();
      }
    };
  }

  async loadCaptions() {
    const {
      captions,
      captionFile,
      captionFileType
    } = await this.loadRandomCaptionFile(this.folder);

    if (!captions) {
      return [];
    }

    this.captions = captions;
    this.captionFile = basename(captionFile);
    this.captionFileType = captionFileType;
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
    const lines = readFileSync(file, 'UTF-8').toString();

    const flatGroups = lines
      .replace('\r\n', '\n')
      .replace('\r', '\n')
      .split(/\n{2,}/);

    const arrayGroups = flatGroups.map((string) =>
      string.split(/\n/).filter((line) => line.trim() !== '')
    );

    return arrayGroups;
  }

  getMatchRegexps(words) {
    const escapeRegExp = (string) =>
      string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return words.map((word) => new RegExp(`\\b${escapeRegExp(word)}\\b`, 'i'));
  }

  async loadRandomCaptionFile(folder) {
    const captionFile = sample(
      glob.sync(`${folder}/**/${this.captionFileGlob}`)
    );
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

  getCaptions(num) {
    let captions = this.captions;

    // @todo Make all the captions array groups so we don't have to switch on this
    if (Array.isArray(captions[0])) {
      const maxGroups = captions.length;
      let randomGroup = random(0, maxGroups - 1);
      let runningCaptions = [];
      while (runningCaptions.length < num) {
        runningCaptions = [
          ...runningCaptions,
          ...captions[randomGroup % maxGroups]
        ];
        randomGroup += 1;
      }
      if (runningCaptions.length > num * 3) {
        const randomCutOff = random(0, runningCaptions.length - num);
        runningCaptions = runningCaptions.slice(
          randomCutOff,
          randomCutOff + num
        );
      }
      return runningCaptions.slice(0, num);
    }

    const upperBound = Math.max(0, captions.length - num);
    const index = random(0, upperBound);
    return captions.slice(index, index + num);
  }

  isBanned(captions) {
    return captions.find((caption) => {
      return this.banned.find((word) => {
        const regexp = new RegExp(`\\b${word}\\b`, 'i');
        return regexp.test(caption);
      });
    });
  }

  getSentenceCaptions(num, maxTries = 100) {
    let isValid = false;
    let captions = [];
    for (let i = 0; i < maxTries && !isValid; i++) {
      captions = this.getCaptions(num);
      isValid =
        captions.length > 0 &&
        !first(captions).match(/^[a-z]/) &&
        !this.isBanned(captions);
      if (!isValid) {
        captions = [];
      }
    }
    return captions;
  }

  count(str, ch) {
    return countBy(str)[ch] || 0;
  }

  sanitizeCaption(caption) {
    const bookends = [['“', '”']];
    const doubles = ['"'];
    let sanitizedCaption = caption;
    bookends.forEach(([open, close]) => {
      if (caption.indexOf(open) === -1 || caption.indexOf(close) === -1) {
        sanitizedCaption = sanitizedCaption
          .replace(open, '')
          .replace(close, '');
      }
    });
    doubles.forEach((double) => {
      if (this.count(caption, double) === 1) {
        sanitizedCaption = sanitizedCaption.replace(double, '');
      }
    });
    return sanitizedCaption;
  }

  sanitizeCaptions(captions) {
    return captions.map((c) => this.sanitizeCaption(c));
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
    if (this.captionText) {
      return this.captionText.map((c) => [this.sanitizeCaption(c.toString())]);
    }

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

    let captions = this.getSentenceCaptions(totalCaptions);

    if (this.captionFile) {
      console.log(`📙 Picking ${totalCaptions} from ${this.captionFile}`);
    }

    if (globals && globals.user) {
      console.log(`📙 Adding user ${globals.user.name}`);
      captions = replaceUser(captions, globals.user.name);
    }

    const transformMethods = this.applySameTransform
      ? [sample(Object.values(this.transformations))]
      : Object.values(this.transformations);
    const isApply = Math.random() < this.transformationRate;

    if (this.transformationRate > 0 && transformMethods.length > 0) {
      captions = captions.map((caption) =>
        (this.applySameTransform && isApply) ||
        (!this.applySameTransform && Math.random() < this.transformationRate)
          ? sample(transformMethods)(caption)
          : caption
      );
    }

    captions = this.sanitizeCaptions(captions);

    const groups = [];
    let currentIndex = 0;
    for (const count of counts) {
      groups.push(captions.slice(currentIndex, currentIndex + count));
      currentIndex += count;
    }
    return groups;
  }
}

module.exports = GlobalsCaptions;
