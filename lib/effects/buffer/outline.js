const getVips = require('../../utils/vips');

module.exports = async (
  buffer,
  { opacity = 0.2, threshold = 35, sigma = 1.2 } = {}
) => {
  const vips = await getVips();
  let im = vips.Image.newFromBuffer(buffer);
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
  return im.writeToBuffer('.png');
};
