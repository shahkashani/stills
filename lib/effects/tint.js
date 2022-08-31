const sharp = require('../utils/sharp');

module.exports = async (
  buffer,
  { color = 'rgba(255, 0, 0, 0.99)', gamma = 2 } = {}
) => {
  const image = await sharp(buffer);
  const { width, height } = await image.metadata();

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

  return image
    .composite([{ input: foreground, blend: 'soft-light' }])
    .gamma(gamma)
    .removeAlpha()
    .toBuffer();
};
