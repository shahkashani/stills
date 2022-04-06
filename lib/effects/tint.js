const execCmd = require('../utils/exec-cmd');

module.exports = async (
  { file },
  { color = 'red', opacity = 0.9, stripProfile = true } = {}
) => {
  execCmd(
    `convert "${file}" -fill "${color}" -tint ${opacity * 100}% ${
      stripProfile ? '-strip' : ''
    } "${file}"`
  );
};
