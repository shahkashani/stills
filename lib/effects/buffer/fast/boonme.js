const geometric = require('geometric');
const sharp = require('../../../utils/sharp');
const SVG = require('../../../utils/svg');
const getBoundingBox = require('../../../utils/get-bounding-box');
const roundPolygon = require('../../../utils/round-polygon');

const STRETCH_FACTOR = 1.5;
const EXPAND_FACTOR = 0.8;
const BLUR_FACTOR = 0.06;
const PEN_STYLE = 'circle';

const silhouette = [
  234, 127, 162, 21, 54, 103, 67, 109, 10, 338, 297, 332, 284, 251, 389, 356,
  454
];

const stretchPoints = (points) => {
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
  const widths = [];

  svg.rect(width, height).fill('white');

  for (const face of faces) {
    const points1 = face.annotations.silhouette;
    const points2 = silhouette.map((i) => face.mesh[i]);

    const path1 = roundPolygon(points1, 1000, PEN_STYLE);
    const path2 = roundPolygon(stretchPoints(points2), 1000, PEN_STYLE);
    const { width } = getBoundingBox(points1);
    const stroke = width * EXPAND_FACTOR;

    svg.path(path1).fill('black').stroke({ width: stroke, color: 'black' });
    svg.path(path2).fill('black').stroke({ width: stroke, color: 'black' });
    widths.push(width);
  }

  const blur = Math.max(0.3, Math.round(Math.max(...widths) * BLUR_FACTOR));
  const foreground = await sharp(Buffer.from(svg.svg())).blur(blur).toBuffer();

  return await image
    .composite([{ input: foreground, blend: 'multiply' }])
    .toBuffer();
};
