const { exec } = require('shelljs');

module.exports = execCmd = (cmd) => {
  if (!cmd) {
    return;
  }
  const result = exec(cmd, { silent: true });
  if (result.code !== 0) {
    console.log(`🐞 Oops: ${result.stderr}\n> ${cmd}`);
  }
  return result.stdout;
};
