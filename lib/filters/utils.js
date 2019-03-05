const { exec } = require('shelljs');

const getImageInfo = file => {
  const cmd = `identify -format "%n:%w:%h\n" "${file}" | head -1`;
  const result = exec(cmd, { silent: true });
  if (result.code !== 0) {
    return null;
  }
  const out = result.stdout
    .trim()
    .split(':')
    .map(v => parseInt(v, 10));
  const [frameCount, width, height] = out;

  return { frameCount, width, height };
};

module.exports = {
  getImageInfo
};
