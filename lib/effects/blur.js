const execCmd = require('../utils/exec-cmd');

module.exports = async ({ file }, { radius = 10, opacity = 1 } = {}) => {
  execCmd(
    `convert "${file}" -coalesce null: \\( -clone 0 -filter Gaussian -blur 0x${radius} -matte -channel A +level 0,${
      opacity * 100
    }% \\) -gravity center -layers composite "${file}"`
  );
};
