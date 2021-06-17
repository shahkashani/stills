const { upperFirst, countBy } = require('lodash');

const count = (str, ch) => {
  return countBy(str)[ch] || 0;
};

const toClean = (text) => {
  const bookends = [
    ['“', '”'],
    ['(', ')'],
    ['[', ']']
  ];
  const doubles = ['"'];
  let sanitized = text.trim();
  bookends.forEach(([open, close]) => {
    if (sanitized.indexOf(open) === -1 || sanitized.indexOf(close) === -1) {
      sanitized = sanitized.replace(open, '').replace(close, '');
    }
  });
  doubles.forEach((double) => {
    if (count(sanitized, double) === 1) {
      sanitized = sanitized.replace(double, '');
    }
  });
  return sanitized;
};

module.exports = (rawString) => {
  if (!rawString) {
    return '';
  }
  const string = toClean(rawString);
  const punc = new RegExp(/[.?!]$/).test(string) ? '' : '.';
  const clean = string
    .replace(/[\n\r]/g, ' ')
    .replace(/[“”"]/g, '')
    .replace(/,$/, '')
    .replace(/\s{2,}/g, ' ');
  return `${upperFirst(clean)}${punc}`;
};
