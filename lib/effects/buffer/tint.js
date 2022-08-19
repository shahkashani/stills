const sharp = require('../../utils/sharp');

module.exports = async ({ file }, { color = 'red', gamma = 1 } = {}) => {
  const {
    data: image,
    info: { width, height }
  } = await sharp(file).toBuffer({ resolveWithObject: true });

  const foreground = await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: color
    }
  })
    .png()
    .toBuffer();

  await sharp(image)
    .composite([{ input: foreground, blend: 'soft-light' }])
    .gamma(gamma)
    .removeAlpha()
    .toFile(file);
};
