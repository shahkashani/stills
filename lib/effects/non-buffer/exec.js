const { execSync } = require('child_process');

module.exports = async ({ file }, cmd) => {
  execSync(`convert "${file}" ${cmd} "${file}"`);
};
