const execCmd = require('../utils/exec-cmd');
const getRawDrawCommand = require('../utils/get-raw-draw-command');
const getImperfectCircle = require('../utils/get-imperfect-circle');

const getEyeDetails = (annotation) => {
  const width = Math.abs(annotation[3][0] - annotation[1][0]);
  const height = Math.abs(annotation[4][1] - annotation[2][1]);
  const size = Math.max(width, height);
  const x = annotation[0][0];
  const y = annotation[0][1];
  return { width, height, x, y, size };
};

const getFeaturesCmd = (
  frame,
  face,
  { color, blur, debugColor, imperfection }
) => {
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

  const commands = coordinates.map(({ x, y }) => {
    if (imperfection > 0) {
      return `-draw '${getImperfectCircle(
        x,
        y,
        size,
        size * (1 + imperfection)
      )}'`;
    } else {
      return `-draw 'circle ${x},${y} ${x},${y + size}'`;
    }
  });

  return getRawDrawCommand(frame, commands, {
    fill: debugColor ? debugColor : color,
    effects: `-blur 0x${size * blur}`
  });
};

module.exports = async (
  frame,
  { color = '#eeeeee', debugColor = null, blur = 0.15, imperfection = 0 } = {}
) => {
  const result = await frame.detectHumans();
  const faces = result.face;
  if (faces.length === 0) {
    return;
  }
  for (const face of faces) {
    const cmd = getFeaturesCmd(frame, face, {
      color,
      imperfection,
      blur,
      debugColor
    });
    execCmd(cmd);
  }
};
