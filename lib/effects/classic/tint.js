const gm = require('gm').subClass({ imageMagick: true });

module.exports = async (buffer, { color = 'red', opacity = 1 } = {}) => {
  return new Promise((resolve, reject) => {
    gm(buffer)
      .command('convert')
      .out('-fill', color)
      .out('-tint', `${opacity * 100}%`)
      .out('-strip')
      .toBuffer('PNG', function (err, buffer) {
        if (err) {
          return reject(err);
        }
        resolve(buffer);
      });
  });
};
