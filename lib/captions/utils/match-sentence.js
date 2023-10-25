const nlp = require('compromise');
const { sample } = require('lodash');
const filterArray = require('./filter-array');
nlp.extend(require('compromise-sentences'));
nlp.extend(require('./compromise-brackets'));

const SEPARATORS = [/\-+/, '…', /\.+/, /\?+/, /\!+/, ','];

class SentenceMatcher {
  constructor(sentence, blueprint, previous, options) {
    this.sentence = nlp(sentence);
    this.blueprint = nlp(blueprint);
    this.previous = nlp(previous);
    this.options = options || {};

    if (this.previous.terms().length === 0) {
      this.previous = null;
    }
    if (
      this.sentence.terms().length === 0 ||
      this.blueprint.terms().length === 0
    ) {
      throw new Error('Invalid input');
    }
  }

  isFullStopped(sentence) {
    return sentence
      .text()
      .trim()
      .match(/[.?!:]$/);
  }

  isUpperCase(sentence) {
    const sanitized = sentence
      .match('!#Bracket')
      .text()
      .replace(/[^A-z]/g, '');

    const uppercaseCount = sanitized
      .split('')
      .filter((a) => a === a.toUpperCase()).length;
    return uppercaseCount > sanitized.length * 0.9;
  }

  getFirstWord(sentence) {
    return sentence.match('!#Bracket').first();
  }

  getLastWord(sentence) {
    return sentence.match('!#Bracket').last();
  }

  join(array) {
    return Array.isArray(array) ? array.join('') : array;
  }

  getSimpleMatch(query) {
    const match = this.blueprint.match(query);
    const groups = match.groups();
    return groups && groups.match ? groups.match.out('array') : [];
  }

  addStartSeparators() {
    const prefixes = this.getFirstWord(this.blueprint).pre();
    const first = this.getFirstWord(this.sentence);
    const prefix = filterArray(prefixes, SEPARATORS);
    if (prefix.length > 0) {
      first.pre(prefix);
    }
  }

  addEndSeparators() {
    const postfixes = this.getLastWord(this.blueprint).post();
    const postfix = filterArray(postfixes, SEPARATORS);
    const last = this.getLastWord(this.sentence);

    if (this.join(postfixes) === '') {
      last.post(' ');
    } else if (postfix.length > 0) {
      last.post(`${postfix} `);
    }
  }

  addBracketed() {
    const start = this.blueprint.match('^#Bracket').out('array');
    if (start.length > 0) {
      this.sentence.prepend(start.join(' '));
    }
  }

  matchCase() {
    if (this.isUpperCase(this.blueprint)) {
      this.sentence.toUpperCase();
      return;
    }
    if (this.previous && this.isFullStopped(this.previous)) {
      const word = this.getFirstWord(this.sentence);
      word.toTitleCase();
      return;
    }
    const first = this.getFirstWord(this.blueprint);
    if (first.has('@isUpperCase')) {
      return;
    }
    const word = this.getFirstWord(this.sentence);
    if (first.has('@isTitleCase')) {
      word.toTitleCase();
    } else {
      if (word.has('#ProperNoun')) {
        return;
      }
      word.toLowerCase();
    }
  }

  addConjunctions() {
    const end = this.getSimpleMatch('[<match>#Conjunction]$');
    const start = this.getSimpleMatch('^[<match>#Conjunction]');

    if (end.length > 0 && !this.sentence.has('#Conjunction$')) {
      this.sentence.sentences().last().post('').append(end.join(' '));
    }
    if (start.length > 0 && !this.sentence.has('^#Conjunction')) {
      this.sentence.sentences().first().pre('').prepend(start.join(' '));
    }
  }

  fixIs() {
    this.sentence.termList().forEach((term) => {
      if (term.reduced === 'i') {
        term.toTitleCase();
      }
    });
  }

  text() {
    const text = this.sentence.text().trim();
    return text.replace(/\[+/g, '[').replace(/\]+/g, ']');
  }

  prependConnectors() {
    const firstSentence = this.sentence.first();
    const useConnector =
      this.options.connector || sample(['and', 'but', 'yet, ']);
    firstSentence.prepend(
      this.isUpperCase(this.sentence)
        ? useConnector.toUpperCase()
        : useConnector.toLowerCase()
    );
  }

  addConnectors() {
    const first = this.sentence.terms().first();
    const firstSentence = this.sentence.first();

    if (this.previous) {
      if (this.isFullStopped(this.previous)) {
        return;
      }
    }

    if (
      this.join(first.pre()) === '' &&
      first.termList()[0].reduced.length !== 1 &&
      !firstSentence.has('^@isTitleCase') &&
      !firstSentence.has('^#Conjunction')
    ) {
      this.prependConnectors();
    }
  }

  match() {
    this.addStartSeparators();
    this.addEndSeparators();
    this.addConjunctions();
    this.matchCase();
    this.addConnectors();
    this.addBracketed();
    this.fixIs();
    return this.text();
  }
}

module.exports = (options) => (sentence, blueprint, previous) => {
  try {
    const sentenceMatcher = new SentenceMatcher(
      sentence,
      blueprint,
      previous,
      options
    );
    return sentenceMatcher.match();
  } catch (err) {
    console.warn('Error matching text', { sentence, blueprint, previous });
    return sentence;
  }
};
