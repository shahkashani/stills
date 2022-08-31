const getImperfectCircle = require('../../utils/get-imperfect-circle');
const sharp = require('../../utils/sharp');
const SVG = require('../../utils/svg');
const getEyeDetails = require('../../utils/get-eye-details');

const getEyes = (face, imperfection) => {
  if (
    !face.annotations.leftEyeIris ||
    !face.annotations.rightEyeIris ||
    !face.annotations.leftEyeIris[0] ||
    !face.annotations.rightEyeIris[0]
  ) {
    return null;
  }

  const bounds1 = getEyeDetails(face.annotations.leftEyeIris);
  const bounds2 = getEyeDetails(face.annotations.rightEyeIris);
  const coordinates = [bounds1, bounds2];
  const size = (bounds1.size + bounds2.size) / 2;

  return coordinates.map(({ x, y }) =>
    getImperfectCircle(x, y, size, size * (1 + imperfection))
  );
};

module.exports = async (
  frame,
  image,
  { color = '#eeeeee', imperfection = 0 } = {}
) => {
  const result = await frame.detectHumans();
  const { width, height } = image.getInfo();
  const faces = result.face;
  if (faces.length === 0) {
    return;
  }
  const results = faces.reduce(
    (memo, face) => [...memo, ...getEyes(face, imperfection)],
    []
  );

  const background = await sharp(frame.file).toBuffer();
  const svg = SVG().size(width, height).fill({ color });

  for (const result of results) {
    svg.polygon(result);
  }

  const foreground = await sharp(Buffer.from(svg.svg())).toBuffer();

  await sharp(background)
    .composite([{ input: foreground }])
    .toFile(frame.file);
};
