const sharp = require('../../utils/sharp');

module.exports = async (buffer, { radius = 10, opacity = 1 } = {}) => {
  const background = await sharp(buffer);
  const foreground = await sharp(buffer)
    .blur(radius)
    .ensureAlpha(opacity)
    .toBuffer();

  return await background
    .composite([{ input: foreground }])
    .removeAlpha()
    .toBuffer();
};
