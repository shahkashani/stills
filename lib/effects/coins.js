const execCmd = require('../utils/exec-cmd');
const {
  getBoundingBox,
  isAngled,
  getFallbackCoordinates,
  getAngle,
  getDegreesBetween
} = require('../utils/faces');
const getRawDrawCommand = require('../utils/get-raw-draw-command');

const MIN_SIZE = 2;

const getFallback = (face) => {
  const {
    width,
    height,
    center: { x, y }
  } = getFallbackCoordinates(face);

  const angle = getAngle(face);

  const baselineY = Math.round(y - height * 0.2);
  const distance = Math.max(MIN_SIZE * 2, width * 0.15);
  const diffY = (height / 10) * (angle.roll / 2);

  return [
    { x: Math.round(x - distance), y: baselineY },
    { x: Math.round(x + distance), y: Math.round(baselineY + diffY) }
  ];
};

const getFeaturesCmd = (frame, face, { color, blur, debugColor }) => {
  const eye1 = face.landmarks.getLeftEye();
  const eye2 = face.landmarks.getRightEye();
  const bounds1 = getBoundingBox(eye1);
  const bounds2 = getBoundingBox(eye2);
  const size = Math.max(MIN_SIZE, Math.min(bounds1.width, bounds1.height));

  const degreesBetween = getDegreesBetween(eye1[0], eye2[0]);
  const useFallback = isAngled(face) || Math.abs(degreesBetween) > 20;
  const coordinates = useFallback ? getFallback(face) : [bounds1, bounds2];

  const commands = coordinates.map(({ x, y }) => {
    const startX = x + size / 2;
    const startY = y + size / 2;
    return `-draw 'circle ${startX},${startY} ${startX},${startY + size}'`;
  });

  return getRawDrawCommand(frame, commands, {
    fill: useFallback && debugColor ? debugColor : color,
    effects: `-blur 0x${size * blur}`
  });
};

module.exports = async (
  frame,
  { color = '#eeeeee', debugColor = null, blur = 0.15 } = {}
) => {
  const faces = await frame.getFaces();
  if (faces.length === 0) {
    return;
  }
  for (const face of faces) {
    execCmd(
      getFeaturesCmd(frame, face, {
        color,
        blur,
        debugColor
      })
    );
  }
};
