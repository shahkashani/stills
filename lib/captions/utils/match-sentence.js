const nlp = require('compromise');
const filterArray = require('./filter-array');
nlp.extend(require('compromise-sentences'));
nlp.extend(require('./compromise-brackets'));

const SEPARATORS = [/\-+/, '…', /\.+/, /\?+/, /\!+/, ','];

class SentenceMatcher {
  constructor(sentence, blueprint) {
    this.sentence = nlp(sentence);
    this.blueprint = nlp(blueprint);
  }

  isUpperCase() {
    const sanitized = this.blueprint
      .match('!#Bracket')
      .text()
      .replace(/[^A-z]/g, '');
    return nlp(sanitized).has('@isUpperCase');
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
    if (this.isUpperCase()) {
      this.sentence.toUpperCase();
      return;
    }
    const first = this.getFirstWord(this.blueprint);
    if (!first.has('@isTitleCase') && !first.has('@isUpperCase')) {
      this.getFirstWord(this.sentence).toLowerCase();
      return;
    }
  }

  addConjunctions() {
    const end = this.getSimpleMatch('[<match>#Conjunction]$');
    const start = this.getSimpleMatch('^[<match>#Conjunction]');

    if (end.length > 0 && !this.sentence.has('#Conjunction$')) {
      this.sentence.sentences().post('').append(end.join(' '));
    }
    if (start.length > 0 && !this.sentence.has('^#Conjunction')) {
      this.sentence.sentences().pre('').prepend(start.join(' '));
      this.sentence.first().toLowerCase();
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
    const last = this.sentence.terms().last();
    if (
      this.join(first.pre()) === '' &&
      !this.sentence.has('^@isTitleCase') &&
      !this.sentence.has('^#Conjunction')
    ) {
      this.sentence.prepend('and');
    }
  }

  match() {
    this.addStartSeparators();
    this.addEndSeparators();
    this.addConjunctions();
    this.addConnectors();
    this.matchCase();
    this.addBracketed();
    this.fixIs();
    return this.text();
  }
}

module.exports = (sentence, blueprint) => {
  const sentenceMatcher = new SentenceMatcher(sentence, blueprint);
  return sentenceMatcher.match();
};
