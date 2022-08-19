const exec = require('./exec');

module.exports = async (frame) => {
  return await exec(
    frame,
    `\\( +clone -canny 0x1+5%+10% -matte -channel A +level 0,15% \\) -composite -modulate 135,50,100 -fill "#222b6d" -colorize 20 -gamma 0.5 -contrast-stretch 25%x0.05%`
  );
};
