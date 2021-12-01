const execCmd = require('../utils/exec-cmd');
const {
  getBoundingBox,
  isAngled,
  getFallbackCoordinates,
  getAngle,
  getDegreesBetween,
  getDistanceBetween,
  getCenter
} = require('../utils/faces');
const getRawDrawCommand = require('../utils/get-raw-draw-command');

const MIN_SIZE = 2;
const MAX_DEGREES = 40;

const getFallback = (face, distance) => {
  const {
    height,
    center: { x, y }
  } = getFallbackCoordinates(face);

  const angle = getAngle(face);

  const baselineY = Math.round(y - height * 0.2);
  const useDistance = Math.max(MIN_SIZE * 2, distance);
  const diffY = (height / 10) * (angle.roll / 2);

  return [
    { x: Math.round(x - useDistance), y: baselineY },
    { x: Math.round(x + useDistance), y: Math.round(baselineY + diffY) }
  ];
};

const getFeaturesCmd = (frame, face, { color, blur, debugColor }) => {
  const eye1 = face.landmarks.getLeftEye();
  const eye2 = face.landmarks.getRightEye();
  const bounds1 = getBoundingBox(eye1);
  const bounds2 = getBoundingBox(eye2);
  const size = Math.max(MIN_SIZE, Math.min(bounds1.width, bounds1.height));

  const degreesBetween = getDegreesBetween(eye1[0], eye2[0]);
  const useFallback = Math.abs(degreesBetween) > MAX_DEGREES; // || isAngled(face);
  const coordinates = useFallback
    ? getFallback(
        face,
        getDistanceBetween(getCenter(bounds1), getCenter(bounds2))
      )
    : [bounds1, bounds2];

  const commands = coordinates.map(({ x, y, width, height }) => {
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const startX = centerX + size / 2;
    const startY = centerY + size / 2;
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
