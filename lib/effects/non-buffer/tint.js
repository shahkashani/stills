const exec = require('./exec');
const gm = require('gm').subClass({ imageMagick: true });

module.exports = async (
  frame,
  { color = 'red', opacity = 1, stripProfile = true } = {}
) => {
  return new Promise((resolve, reject) => {
    gm(frame.file)
      .command('convert')
      .out('-fill', color)
      .out('-tint', `${opacity * 100}%`)
      .out('-strip')
      .write(frame.file, function (err) {
        if (err) {
          return reject(err);
        }
        resolve();
      });
  });

  return await exec(
    frame,
    `-fill "${color}" -tint ${opacity * 100}% ${stripProfile ? '-strip' : ''}`
  );
};
