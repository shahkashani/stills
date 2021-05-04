const execCmd = require('./exec-cmd');

module.exports = isTransparent = (filename) => {
  const result = execCmd(`convert "${filename}[0]" -format "%[opaque]" info:`);
  return result !== 'True';
};
