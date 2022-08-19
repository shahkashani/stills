const sharp = require('../../utils/sharp');
const SVG = require('../../utils/svg');
const geometric = require('geometric');
const getBoundingBox = require('../../utils/get-bounding-box');

const STRETCH_FACTOR = 1.8;
const BLUR_FACTOR = 0.03;
const STROKE_FACTOR = 0.5;

const silhouette = [
  234, 127, 162, 21, 54, 103, 67, 109, 10, 338, 297, 332, 284, 251, 389, 356,
  454
];

const getPolygon = (points) => {
  return points.map((arr) => `${arr[0]},${arr[1]}`).join(' ');
};

const stretchPolygon = (points) => {
  const bounds = geometric.polygonBounds(points);
  const centroid = geometric.polygonCentroid(points);
  const origin = [centroid[0], bounds[1][1]];
  return geometric.polygonScaleY(points, STRETCH_FACTOR, origin);
};

module.exports = async (buffer, frame) => {
  const result = await frame.detectHumans();
  const faces = result.face;
  if (faces.length === 0) {
    return buffer;
  }

  const image = await sharp(buffer);

  const { width, height } = await image.metadata();

  const svg = SVG().size(width, height);

  svg.rect(width, height).fill('white');

  const widths = [];

  for (const face of faces) {
    const points = face.annotations.silhouette;
    const polygon = getPolygon(points);

    const { width } = getBoundingBox(points);
    const stroke = Math.round(width * STROKE_FACTOR);

    const stretched = getPolygon(
      stretchPolygon(silhouette.map((i) => face.mesh[i]))
    );

    svg
      .polygon(polygon)
      .fill('black')
      .stroke({ color: 'black', width: stroke });
    svg
      .polygon(stretched)
      .fill('black')
      .stroke({ color: 'black', width: stroke });
    widths.push(width);
  }

  const blur = Math.round(Math.max(...widths) * BLUR_FACTOR);
  const foreground = await sharp(Buffer.from(svg.svg())).blur(blur).toBuffer();

  return await image
    .composite([{ input: foreground, blend: 'multiply' }])
    .toBuffer();
};
