const exec = require('./exec');

module.exports = async (frame) => {
  await exec(
    frame,
    `-modulate 135,50,100 -fill "#222b6d" -colorize 20 -gamma 0.5 -contrast-stretch 25%x0.05%`
  );
};
