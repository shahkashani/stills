const getVips = require('../../utils/vips');
const { writeFileSync } = require('fs');

module.exports = async (frame, { opacity = 0.2, threshold = 50, sigma = 1.8 } = {}) => {
  const vips = await getVips();
  let im = vips.Image.newFromFile(frame.file);
  let original = im;
  im = im
    .canny({
      sigma,
      precision: vips.Precision.float
    })
    .multiply(64)
    .colourspace('b-w')
    .moreEq(threshold)
    .bandjoin(255 * opacity);

  im = original.composite(im, 'over');
  im = im.extractBand(0, { n: im.bands - 1 });

  const outputBuffer = im.writeToBuffer('.png');
  writeFileSync(frame.file, outputBuffer);
};
