const getImperfectCircle = require('../utils/get-imperfect-circle');
const sharp = require('../utils/sharp');
const SVG = require('../utils/svg');
const { range } = require('lodash');

const getDots = (coordinates, imperfection, percent) => {
  return coordinates.map(({ x, y, radius, size }) => {
    const cosine = Math.cos(percent * Math.PI * 2);
    const sine = Math.sin(percent * Math.PI * 2);

    return getImperfectCircle(
      x + cosine * radius,
      y + sine * radius,
      size,
      size * (1 + imperfection)
    );
  });
};

module.exports = async (
  buffer,
  image,
  { percent = 0, color = 'white', imperfection = 0.3 } = {}
) => {
  const background = await sharp(buffer);
  const { width, height } = await background.metadata();
  const result = await frame.detectHumans();
  const faces = result.face;

  let coordinates = image.getData('dots');
  if (!coordinates) {
    coordinates = range(1, 100).map(() => ({
      x: Math.round(Math.random() * width),
      y: Math.round(Math.random() * height),
      size: 1 + Math.round(Math.random() * 5),
      radius: 2 + Math.round(Math.random() * 100)
    }));
    image.setData('dots', coordinates);
  }

  const results = getDots(coordinates, imperfection, percent);
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
