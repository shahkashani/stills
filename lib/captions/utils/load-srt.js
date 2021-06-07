const parseSubs = require('parse-srt');
const { readFileSync } = require('fs');

module.exports = (file) => {
  const data = readFileSync(file, 'UTF-8').toString();
  try {
    const srt = parseSubs(data);
    return srt.map((line) => ({
      ...line,
      text: line.text
        .replace(/\<br \/\>/gi, ' ')
        .replace(/[\n\r]/, ' ')
        .replace(/\./g, '. ')
        .replace(/<(?:.|\n)*?>/gm, '')
        .replace(/\s{2,}/g, ' ')
        .trim()
    }));
  } catch (err) {
    console.log(`🐞 Could not load subtitle (${file}).`, err);
    return [];
  }
};
