const getVips = require('../utils/vips');

module.exports = async (buffer, { color = [255, 95, 86] } = {}) => {
  const vips = await getVips();

  const tintImage = vips.Image.black(1, 1)
    .newFromImage(color)
    .colourspace(vips.Interpretation.lab, {
      source_space: vips.Interpretation.srgb
    })
    .bandsplit();

  const tint = new Array(tintImage.size())
    .fill(0)
    .map((_, i) => tintImage.get(i).avg());

  tintImage.delete();

  // start with an RGB greyscale, then go to LAB
  let lab = vips.Image.identity({ bands: 3 }).colourspace(
    vips.Interpretation.lab,
    {
      source_space: vips.Interpretation.srgb
    }
  );

  // scale to 0-1 and make a weighting function
  // x = lab[0] / 100
  const x = lab.extractBand(0).divide(100);
  // weight = 1 - 4.0 * ((x - 0.5) ** 2)
  const weight = x.subtract(0.5).pow(2).multiply(4).multiply(-1).add(1);

  // we want L to stay the same, we just weight ab
  // lab = lab[0].bandjoin((weight * tint)[1:])
  lab = lab
    .extractBand(0)
    .bandjoin(weight.multiply(tint).extractBand(1, { n: lab.bands - 1 }));

  // and turn to sRGB
  const lut = lab.colourspace(vips.Interpretation.srgb, {
    source_space: vips.Interpretation.lab
  });

  lab.delete();

  const im = vips.Image.newFromBuffer(buffer, '', {
    access: vips.Access.sequential
  });

  if (im.hasAlpha()) {
    const withoutAlpha = im.extractBand(0, { n: im.bands - 1 });
    const alpha = im.extractBand(im.bands - 1);
    const im2 = withoutAlpha.colourspace(vips.Interpretation.b_w);
    const im3 = im2.maplut(lut);
    const im4 = im3.bandjoin(alpha);
    const newBuffer = im4.writeToBuffer('.png');
    im.delete();
    im2.delete();
    im3.delete();
    im4.delete();
    withoutAlpha.delete();
    return newBuffer;
  } else {
    const im2 = im.colourspace(vips.Interpretation.b_w);
    const im3 = im2.maplut(lut);
    const newBuffer = im3.writeToBuffer('.png');
    im.delete();
    im2.delete();
    im3.delete();
    return newBuffer;
  }
};
