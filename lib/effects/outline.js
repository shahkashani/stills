const exec = require('./exec');

module.exports = async (frame) => {
  await exec(
    frame,
    `\\( +clone -canny 0x1+5%+10% -matte -channel A +level 0,15% \\) -composite`
  );
};
