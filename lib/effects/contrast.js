const sharp = require('../utils/sharp');

module.exports = async (
  buffer,
  { contrast = 2, saturation = 0.3, brightness = 0.9 } = {}
) => {
  return await sharp(buffer)
    .linear(contrast, -(128 * contrast) + 128)
    .modulate({ saturation, brightness })
    .removeAlpha()
    .toBuffer();
};
