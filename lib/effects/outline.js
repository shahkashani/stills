const exec = require('./exec');
const sharp = require('../utils/sharp');

module.exports = async (frame) => {
  const background = await sharp(frame.file).toBuffer();
  const foreground = await sharp(background)
    .grayscale()
    .convolve({
      width: 3,
      height: 3,
      kernel: [-1, -2, -1, 0, 0, 0, 1, 2, 1]
    })
    .threshold(127)
    .ensureAlpha(0.15)
    .toBuffer();

  /*await exec(
    frame,
    `\\( +clone -canny 0x1+5%+10% -matte -channel A +level 0,100% \\) -composite`
  );
  */

  await sharp(background)
    .composite([{ input: foreground }])
    .removeAlpha()
    .toFile(frame.file);
};
