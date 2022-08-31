const sharp = require('../utils/sharp');

module.exports = async (buffer, { radius = 10, opacity = 0.5 } = {}) => {
  const background = await sharp(buffer).toBuffer();
  const foreground = await sharp(buffer).blur(radius).ensureAlpha(opacity).toBuffer();

  return await sharp(background)
    .composite([{ input: foreground }])
    .removeAlpha()
    .toBuffer();
};
