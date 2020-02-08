const nlp = require('compromise');
const { sample } = require('lodash');

function replaceUser(captions, name) {
  const string = captions[0];
  const doc = nlp(string);

  if (doc.people().length > 0) {
    const person = doc
      .people()
      .first()
      .text();
    return [doc.replace(person, name, true).text()];
  }

  if (string.indexOf(']') !== -1) {
    return [string.replace(']', `] ${name}${sample(['.', '!', '?'])}`)];
  }

  return captions;

  /*
  if (string.indexOf(')') !== -1) {
    return [string.replace(')', `) ${name}${sample(['.', '!', '?'])}`)];
  }

  if (string.match(/♪$/)) {
    return [string.replace(/\s*♪$/, `, ${name} ♪`)];
  }

  if (string.match(/\.\.$/)) {
    return [string.replace(/\.\.$/, `..right, ${name}?`)];
  }

  const endPunc = new RegExp(/([.!?])$/);
  if (endPunc.test(string)) {
    return [string.replace(endPunc, `, ${name}\$1`)];
  }

  return [`${string.replace(/,$/, '')}, ${name}`];
  */
}

module.exports = replaceUser;
