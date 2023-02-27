const nlp = require('compromise');
const { sample } = require('lodash');
const filterArray = require('./filter-array');
nlp.extend(require('compromise-sentences'));
nlp.extend(require('./compromise-brackets'));

const SEPARATORS = [/\-+/, '…', /\.+/, /\?+/, /\!+/, ','];

class SentenceMatcher {
  constructor(sentence, blueprint, options) {
    this.sentence = nlp(sentence);
    this.blueprint = nlp(blueprint);
    this.options = options || {};
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
    const first = this.getFirstWord(this.blueprint);
    if (first.has('@isUpperCase')) {
      return;
    }
    if (first.has('@isTitleCase')) {
      this.getFirstWord(this.sentence).toTitleCase();
    } else {
      this.getFirstWord(this.sentence).toLowerCase();
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

  addConnectors() {
    const first = this.sentence.terms().first();
    const firstSentence = this.sentence.first();
    const useConnector =
      this.options.connector || sample(['and', 'but', 'though']);
    if (
      this.join(first.pre()) === '' &&
      first.termList()[0].reduced.length !== 1 &&
      !firstSentence.has('^@isTitleCase') &&
      !firstSentence.has('^#Conjunction')
    ) {
      firstSentence.prepend(
        this.isUpperCase(this.sentence)
          ? useConnector.toUpperCase()
          : useConnector.toLowerCase()
      );
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

module.exports = (options) => (sentence, blueprint) => {
  const sentenceMatcher = new SentenceMatcher(sentence, blueprint, options);
  return sentenceMatcher.match();
};
