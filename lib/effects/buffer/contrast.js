const sharp = require('../../utils/sharp');

module.exports = async (
  frame,
  { contrast = 2, saturation = 0.3, brightness = 0.8 } = {}
) => {
  const image = await sharp(frame.file).toBuffer();
  const outputBuffer = await sharp(image)
    .linear(contrast, -(128 * contrast) + 128)
    .modulate({ saturation, brightness })
    .removeAlpha();

  await outputBuffer.toFile(frame.file);
};
