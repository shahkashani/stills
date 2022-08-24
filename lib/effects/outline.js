const exec = require('./exec');
const gm = require('gm').subClass({ imageMagick: true });

module.exports = async (frame) => {
  return new Promise((resolve, reject) => {
    gm(frame.file)
      .command('convert')
      .out('(')
        .out('+clone')
        .out('-canny', '0x1+5%+10%')
        .matte()
        .channel('A')
        .out('+level', '0,15%')
      .out(')')
      .out('-composite')
      .modulate(135, 50, 100)
      .fill('#222b6d')
      .colorize(20)
      .gamma(0.5)
      .out('-contrast-stretch', '25%x0.05%')
      .write(frame.file, (err) => {
        if (err) {
          return reject(err);
        }
        resolve();
      });
  });

  return await exec(
    frame,
    `\\( +clone -canny 0x1+5%+10% -matte -channel A +level 0,15% \\) -composite -modulate 135,50,100 -fill "#222b6d" -colorize 20 -gamma 0.5 -contrast-stretch 25%x0.05%`
  );
};
