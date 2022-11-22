const gm = require('gm').subClass({ imageMagick: true });

module.exports = async (buffer) => {
  return new Promise((resolve, reject) => {
    gm(buffer)
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
      .toBuffer('PNG', (err, buffer) => {
        if (err) {
          return reject(err);
        }
        resolve(buffer);
      });
  });
};
