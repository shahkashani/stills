const sharp = require('../utils/sharp');

module.exports = async (buffer, frame, { blur = 0.006 } = {}) => {
  const bodies = await frame.getBodies(0.3);
  if (!bodies) {
    return buffer;
  }
  const { width, height, data } = bodies;
  const blurWidth = width * blur;
  const image = await sharp(data, {
    raw: {
      width,
      height,
      channels: 4
    }
  })
    .png()
    .blur(blurWidth)
    .toBuffer();
  return await sharp(buffer)
    .composite([{ input: image, blend: 'multiply' }])
    .removeAlpha()
    .toBuffer();
};
