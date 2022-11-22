const getVips = require('../utils/vips');

module.exports = async (buffer, { color = [255, 95, 86] } = {}) => {
  const vips = await getVips();

  let tint = color;

  // turn to CIELAB
  tint = vips.Image.black(1, 1)
    .newFromImage(tint)
    .colourspace(vips.Interpretation.lab, {
      source_space: vips.Interpretation.srgb
    })
    .bandsplit();

  tint = new Array(tint.size()).fill(0).map((_, i) => tint.get(i).avg());

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

  let im = vips.Image.newFromBuffer(buffer, '', {
    access: vips.Access.sequential
  });

  if (im.hasAlpha()) {
    // Separate alpha channel
    const withoutAlpha = im.extractBand(0, { n: im.bands - 1 });
    const alpha = im.extractBand(im.bands - 1);
    im = withoutAlpha
      .colourspace(vips.Interpretation.b_w)
      .maplut(lut)
      .bandjoin(alpha);
  } else {
    im = im.colourspace(vips.Interpretation.b_w).maplut(lut);
  }

  return im.writeToBuffer('.png');
};
