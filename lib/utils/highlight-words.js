const { flatten } = require('lodash');

const TOKEN = '*';

module.exports = highlightWords = (
  input,
  isVerbose = false,
  highlightColor = 'red'
) => {
  const text = Array.isArray(input) ? flatten(input).join(' ') : input;
  if (!text || text.length === 0 || text.indexOf('*') === -1) {
    return {
      text,
      formattedText: null,
      formatting: []
    };
  }
  if (!highlightColor) {
    return {
      text: text.replace(/\*/g, ''),
      formattedText: null,
      formatting: []
    };
  }
  const textArray = text.split('');
  const formatting = [];
  let finalText = '';
  let formattedText = '';
  let isInsideToken = false;
  let tokenStartIndex = -1;
  textArray.forEach((letter) => {
    if (letter === TOKEN) {
      if (isInsideToken) {
        isInsideToken = false;
        formatting.push({
          start: tokenStartIndex,
          end: finalText.length,
          type: 'color',
          hex: highlightColor
        });
      } else {
        tokenStartIndex = finalText.length;
        isInsideToken = true;
      }
    } else {
      finalText += letter;
    }
  });
  if (isVerbose) {
    console.log('📒 Final text:', finalText);
  }
  formatting.forEach((f) => {
    const piece = finalText.slice(f.start, f.end);
    formattedText += piece;
    if (isVerbose) {
      console.log(`✏️  Highlighting "${piece}"`);
    }
  });
  return {
    text: finalText,
    highlighted: formattedText,
    formatting
  };
};
