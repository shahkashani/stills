const sharp = require('../utils/sharp');

module.exports = async ({ file }, { radius = 10, opacity = 1 } = {}) => {
  const background = await sharp(file).toBuffer();
  const foreground = await sharp(file).blur(radius).ensureAlpha(opacity).toBuffer();

  await sharp(background)
    .composite([{ input: foreground }])
    .removeAlpha()
    .toFile(file);
};
