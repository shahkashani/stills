const exec = require('./exec');

module.exports = async (
  frame,
  { color = 'red', opacity = 1, stripProfile = true } = {}
) => {
  return await exec(
    frame,
    `-fill "${color}" -tint ${opacity * 100}% ${stripProfile ? '-strip' : ''}`
  );
};
