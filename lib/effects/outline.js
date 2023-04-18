const getVips = require('../utils/vips');

module.exports = async (
  buffer,
  { opacity = 0.2, threshold = 35, sigma = 1.2 } = {}
) => {
  const vips = await getVips();
  const im = vips.Image.newFromBuffer(buffer);
  const im2 = im.canny({
    sigma,
    precision: vips.Precision.float
  });
  const im3 = im2.multiply(64);
  const im4 = im3.colourspace('b-w');
  const im5 = im4.moreEq(threshold);
  const im6 = im5.bandjoin(255 * opacity);
  const im7 = im.composite(im6, 'over');
  const im8 = im7.extractBand(0, { n: im7.bands - 1 });
  const newBuffer = im8.writeToBuffer('.png');

  im.delete();
  im2.delete();
  im3.delete();
  im4.delete();
  im5.delete();
  im6.delete();
  im7.delete();
  im8.delete();
  return newBuffer;
};
