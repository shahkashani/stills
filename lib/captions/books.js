const { sync } = require('glob');
const { sample } = require('lodash');
const { readFileSync } = require('fs');
const tokenizer = require('sbd');
const pdf = require('pdf-parse');

const CaptionsDropin = require('./base/dropin');

class CaptionsBooks extends CaptionsDropin {
  constructor(options = {}) {
    super(options);
    const {
      folder = './captions/other/books',
      minLength = 15,
      maxLength = 75
    } = options;
    this.folder = folder;
    this.minLength = minLength;
    this.maxLength = maxLength;
  }

  get name() {
    return 'books';
  }

  async getText() {
    const files = sync(`${this.folder}/**/*.pdf`);
    const file = sample(files);
    console.log(`📖 ${file}`);
    const string = readFileSync(file);
    const { text } = await pdf(string);
    const sentences = tokenizer.sentences(text);
    const shortishSentences = sentences.filter(
      (sentence) =>
        sentence.length < this.maxLength &&
        sentence.length >= this.minLength &&
        !sentence.match(/^\d+/) &&
        sentence.match(/\.$/)
    );
    const cleanSentences = shortishSentences
      .map((sentence) =>
        sentence
          .replace(/[\n\r]/g, ' ')
          .replace(/\u200B/g, ' ')
          .replace(/[“"”]/g, '')
          .replace(/\s{2,}/g, ' ')
          .replace(/\s+\./g, '.')
          .replace(/^(.{0,4}\s)+/, '')
          .replace(/^[^A-Za-z]+/, '')
          .trim()
      )
      .filter((s) => !!s);
    return sample(cleanSentences);
  }
}

module.exports = CaptionsBooks;
