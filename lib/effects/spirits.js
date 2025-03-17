const geometric = require('geometric');
const sharp = require('../utils/sharp');
const getSvg = require('../utils/svg');
const getBoundingBox = require('../utils/get-bounding-box');
const roundPolygon = require('../utils/round-polygon');
const measure = require('../utils/measure');

const STRETCH_FACTOR = 1.5;
const STROKE_FACTOR = 1;
const BLUR_FACTOR = 0.1;
const PEN_STYLE = 'circle';
const MASK_FILL = '#333';

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

const getBlurWidth = (faces) => {
  const widths = faces.map((face) => {
    const { width } = getBoundingBox(face.annotations.silhouette);
    return width;
  });
  return Math.max(0.3, Math.round(Math.max(...widths) * BLUR_FACTOR));
};

const getStrokeWidth = (face) => {
  const { width } = getBoundingBox(face.annotations.silhouette);
  return width * STROKE_FACTOR;
};

const getTopFaces = async (faces, width, height, { blurWidth }) => {
  const heightPadding = 0;
  const SVG = await getSvg();
  const svg = SVG().size(width, height + heightPadding);

  svg.rect(width, height).fill('black');

  for (const face of faces) {
    const points = stretchPoints(silhouette.map((i) => face.mesh[i]));
    const path = roundPolygon(points, 1000, PEN_STYLE);
    const stroke = getStrokeWidth(face);
    svg
      .path(path)
      .dy(heightPadding)
      .fill(MASK_FILL)
      .stroke({ width: stroke, color: MASK_FILL });
  }

  return await sharp(Buffer.from(svg.svg())).blur(blurWidth).toBuffer();
};

const getMainFaces = async (faces, width, height, { blurWidth }) => {
  const SVG = await getSvg();
  const svg = SVG().size(width, height);

  svg.rect(width, height).fill('black');

  for (const face of faces) {
    const points = face.annotations.silhouette;
    const path = roundPolygon(points, 1000, PEN_STYLE);
    const stroke = getStrokeWidth(face);
    svg.path(path).fill(MASK_FILL).stroke({ width: stroke, color: MASK_FILL });
  }

  return await sharp(Buffer.from(svg.svg())).blur(blurWidth).toBuffer();
};

module.exports = async (buffer, frame) => {
  const result = await frame.detectHumans();
  const faces = result.face;
  if (faces.length === 0) {
    return buffer;
  }

  const image = sharp(buffer);
  const { width, height } = await image.metadata();
  const blurWidth = getBlurWidth(faces);

  const mainFaces = await measure('faces main', () =>
    getMainFaces(faces, width, height, { blurWidth })
  );

  const topFaces = await measure('faces top', () =>
    getTopFaces(faces, width, height, { blurWidth })
  );

  const combined = await sharp(topFaces)
    .composite([{ input: mainFaces, blend: 'add' }])
    .toBuffer();

  const masked = await sharp(buffer)
    .joinChannel(combined)
    .ensureAlpha(0.1)
    .toBuffer();

  const resized = sharp(masked)
    .resize({
      width,
      height,
      gravity: 'center'
    })
    .flop();

  return await sharp(buffer)
    .composite([
      {
        input: await resized.toBuffer(),
        gravity: 'center'
      }
    ])
    .toBuffer();
};
