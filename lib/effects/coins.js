const getImperfectCircle = require('../utils/get-imperfect-circle');
const Blur = require('stackblur-canvas');
const { map } = require('lodash');

const MAX_BLUR = 5;

const getEyeDetails = (annotation) => {
  const width = Math.abs(annotation[3][0] - annotation[1][0]);
  const height = Math.abs(annotation[4][1] - annotation[2][1]);
  const size = Math.max(width, height);
  const x = annotation[0][0];
  const y = annotation[0][1];
  return { width, height, x, y, size };
};

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

  return coordinates.map(({ x, y }) => ({
    size,
    coordinates: getImperfectCircle(x, y, size, size * (1 + imperfection), true)
  }));
};

const getMaxSize = (results) => Math.max(...map(results, 'size'));

module.exports = async (
  frame,
  { color = '#eeeeee', blur = 0.15, imperfection = 0 } = {}
) => {
  const humans = await frame.getHumans();
  const result = await frame.detectHumans();
  const faces = result.face;
  if (faces.length === 0) {
    return;
  }
  const results = faces.reduce(
    (memo, face) => [...memo, ...getEyes(face, imperfection)],
    []
  );
  await humans.draw(frame.edited, frame.edited, async (ctx, canvas) => {
    for (const result of results) {
      humans.linesCoords(ctx, result.coordinates, {
        color,
        fillPolygons: true
      });
    }
    if (blur) {
      const radius = Math.min(MAX_BLUR, getMaxSize(results) * blur);
      Blur.canvasRGB(
        canvas,
        0,
        0,
        canvas.width,
        canvas.height,
        radius
      );
    }
  });
};
