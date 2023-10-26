const getImperfectCircle = require('../utils/get-imperfect-circle');
const sharp = require('../utils/sharp');
const getSvg = require('../utils/svg');
const { range, sortBy, random } = require('lodash');

const MAX_MOVEMENT = 10;

const cap = (num, max = 10) =>
  num < 0 ? Math.max(num, -1 * max) : Math.min(num, max);

const getLeftMostFace = (faces) => {
  const sorted = sortBy(faces, (f) => f.box[0]);
  return sorted[0];
};

const getDots = (
  coordinates,
  offset,
  imperfection,
  max = MAX_MOVEMENT,
  random = 10
) => {
  return coordinates.map(({ x, y, size }) => {
    return getImperfectCircle(
      x + cap(offset.x, max) + Math.random() * random,
      y + cap(offset.y, max) + Math.random() * random,
      size,
      size * (1 + imperfection)
    );
  });
};

const getIrisCoordinates = (result) => {
  if (!result || result.face.length === 0) {
    return null;
  }
  const face = getLeftMostFace(result.face);
  const { leftEyeIris } = face.annotations;
  const [x, y] = leftEyeIris[0];
  return { x, y };
};

const getIrisOffset = (result, origin) => {
  const newCoords = getIrisCoordinates(result);
  if (!newCoords || !origin) {
    return { x: 0, y: 0 };
  }
  return { x: newCoords.x - origin.x, y: newCoords.y - origin.y };
};

module.exports = async (
  buffer,
  frame,
  image,
  { color = 'black', dots = 100, imperfection = 0.3 } = {}
) => {
  const background = await sharp(buffer);
  const { width, height } = await background.metadata();
  const result = await frame.detectHumans();

  let coordinates = image.getData('dots');
  let origin = image.getData('dotsOrigin');

  if (!origin) {
    origin = getIrisCoordinates(result);
    image.setData('dotsOrigin', origin);
  }

  if (!coordinates) {
    coordinates = range(1, dots).map(() => ({
      x: random(-MAX_MOVEMENT, width + MAX_MOVEMENT),
      y: random(-MAX_MOVEMENT, height + MAX_MOVEMENT),
      size: 1 + Math.round(Math.random() * 3)
    }));
    image.setData('dots', coordinates);
  }

  const results = getDots(
    coordinates,
    getIrisOffset(result, origin),
    imperfection
  );
  const SVG = await getSvg();
  const svg = SVG().size(width, height).fill({ color });
  for (const result of results) {
    svg.polygon(result);
  }
  const foreground = await sharp(Buffer.from(svg.svg())).toBuffer();
  const glow = await sharp(foreground).blur(5).toBuffer();

  return await background
    .composite([{ input: glow }, { input: foreground }])
    .toBuffer();
};
