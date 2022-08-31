const geometric = require('geometric');
const gm = require('gm').subClass({ imageMagick: true });
const sharp = require('../utils/sharp');
const SVG = require('../utils/svg');
const getBoundingBox = require('../utils/get-bounding-box');
const roundPolygon = require('../utils/round-polygon');
const measure = require('../utils/measure');

const STRETCH_FACTOR = 1.5;
const STROKE_FACTOR = 0.8;
const BLUR_FACTOR = 0.03;
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

const wave = async (buffer, { width, height, waveWidths }) => {
  return new Promise(async (resolve, reject) => {
    gm(buffer)
      .background('white')
      .wave(...waveWidths)
      .gravity('South')
      .crop(width, height)
      .toBuffer('PNG', (err, buffer) => {
        if (err) {
          return reject(err);
        }
        resolve(buffer);
      });
  });
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

const getWaveWidths = (width) => {
  const wave1 = (5 / 540) * width;
  const wave2 = (25 / 540) * width;
  return [Math.round(wave1), Math.round(wave2)];
};

const getTopFaces = async (faces, width, height, { blurWidth, waveWidths }) => {
  const heightPadding = 0;
  const svg = SVG().size(width, height + heightPadding);

  svg.rect(width, height).fill('white');

  for (const face of faces) {
    const points = stretchPoints(silhouette.map((i) => face.mesh[i]));
    const path = roundPolygon(points, 1000, PEN_STYLE);
    const stroke = getStrokeWidth(face);
    svg
      .path(path)
      .dy(heightPadding)
      .fill('black')
      .stroke({ width: stroke, color: 'black' });
  }

  const buffer = await sharp(Buffer.from(svg.svg())).blur(blurWidth).toBuffer();

  return await measure('wave', () =>
    wave(buffer, { width, height, waveWidths })
  );
};

const getMainFaces = async (faces, width, height, { blurWidth }) => {
  const svg = SVG().size(width, height);

  svg.rect(width, height).fill('white');

  for (const face of faces) {
    const points = face.annotations.silhouette;
    const path = roundPolygon(points, 1000, PEN_STYLE);
    const stroke = getStrokeWidth(face);
    svg.path(path).fill('black').stroke({ width: stroke, color: 'black' });
  }

  return await sharp(Buffer.from(svg.svg())).blur(blurWidth).toBuffer();
};

module.exports = async (buffer, frame) => {
  const result = await frame.detectHumans();
  const faces = result.face;
  if (faces.length === 0) {
    return buffer;
  }

  const image = await sharp(buffer);
  const { width, height } = await image.metadata();
  const blurWidth = getBlurWidth(faces);
  const waveWidths = getWaveWidths(width);

  const mainFaces = await measure('faces main', () =>
    getMainFaces(faces, width, height, { blurWidth })
  );

  const topFaces = await measure('faces top', () =>
    getTopFaces(faces, width, height, { blurWidth, waveWidths })
  );

  const combined = await measure('combine faces', () =>
    sharp(topFaces)
      .composite([{ input: mainFaces, blend: 'multiply' }])
      .toBuffer()
  );

  return await measure('combine image', () =>
    image.composite([{ input: combined, blend: 'multiply' }]).toBuffer()
  );
};
