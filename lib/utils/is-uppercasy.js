const nlp = require('compromise');
nlp.extend(require('compromise-sentences'));
nlp.extend(require('../captions/utils/compromise-brackets'));

module.exports = (string) => {
  const sentence = nlp(string);
  const sanitized = sentence
    .match('!#Bracket')
    .text()
    .replace(/[^A-z]/g, '');
  const uppercaseCount = sanitized
    .split('')
    .filter((a) => a === a.toUpperCase()).length;
  return uppercaseCount > sanitized.length * 0.9;
};
