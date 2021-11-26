const execCmd = require('../utils/exec-cmd');

module.exports = async ({ file }, cmd) => {
  execCmd(`convert "${file}" ${cmd} "${file}"`);
};
