const gm = require('gm').subClass({ imageMagick: true });

module.exports = async (
  buffer,
  {
    modulateB = 135,
    modulateS = 10,
    modulateH = 100,
    fill = '#222b6d',
    colorize = 20,
    gamma = 0.5,
    contrast = '25%x0.05%'
  } = {}
) => {
  return new Promise((resolve, reject) => {
    gm(buffer)
      .command('convert')
      .modulate(modulateB, modulateS, modulateH)
      .fill(fill)
      .colorize(colorize)
      .gamma(gamma)
      .out('-contrast-stretch', contrast)
      .toBuffer('PNG', (err, buffer) => {
        if (err) {
          return reject(err);
        }
        resolve(buffer);
      });
  });
};
