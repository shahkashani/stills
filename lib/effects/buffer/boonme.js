const sharp = require('../../utils/sharp');
const SVG = require('../../utils/svg');
const geometric = require('geometric');
const { getBoundingBox } = require('../../utils/faces');

const STRETCH_FACTOR = 1.8;

const silhouette = [
  234, 127, 162, 21, 54, 103, 67, 109, 10, 338, 297, 332, 284, 251, 389, 356,
  454
];

const getCoords = (points) => {
  return points.map((point) => ({
    x: point[0],
    y: point[1]
  }));
};

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

  for (const face of faces) {
    const points = getPolygon(face.annotations.silhouette);
    const stretched = getPolygon(
      stretchPolygon(silhouette.map((i) => face.mesh[i]))
    );
    svg.polygon(points).fill('black').stroke({ color: 'black', width: '20%' });
    svg
      .polygon(stretched)
      .fill('black')
      .stroke({ color: 'black', width: '20%' });
  }

  const foreground = await sharp(Buffer.from(svg.svg()))
    .blur(width * 0.02)
    .toBuffer();
  return await image
    .composite([{ input: foreground, blend: 'multiply' }])
    .toBuffer();
};
