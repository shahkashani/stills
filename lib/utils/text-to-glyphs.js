module.exports = (text, useGlyphs = true) =>
  useGlyphs ? text.replace(/[^\s.\[\],-]/g, '?') : text;
