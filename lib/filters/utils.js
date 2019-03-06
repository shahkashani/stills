const { exec } = require('shelljs');
const { map } = require('lodash');

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

const getCropCommand = (
  file,
  imageWidth,
  imageHeight,
  instructions,
  { gravity = null } = {}
) => {
  const gravityCmd = gravity ? `-gravity ${gravity}` : '';
  const cmdClone = instructions
    .map(
      ({ width, height, x, y, index }) =>
        `\\( -clone ${index} ${gravityCmd} -crop ${width}x${height}+${x}+${y} -resize ${imageWidth}x${imageHeight}! +repage \\)`
    )
    .join(' ');
  const indexes = map(instructions, 'index').join(',');
  return `convert "${file}" ${cmdClone} -delete ${indexes} -coalesce "${file}"`;
};

module.exports = {
  getImageInfo,
  getCropCommand
};
