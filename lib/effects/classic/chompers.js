const execCmd = require('../../utils/exec-cmd');
const { getBoundingBox, getAngle } = require('../../utils/faces');
const getImperfectCircle = require('../../utils/get-imperfect-circle');
const getRawDrawCommand = require('../../utils/get-raw-draw-command');
const { random } = require('lodash');

const getSize = (width) => random(width * 0.04, width * 0.06);

const getFeaturesCmd = (frame, face, { color, sizeFactor, imperfection }) => {
  const mouth = face.landmarks.getMouth();
  const { x, y, width, height } = getBoundingBox(mouth);

  const commands = [];
  const { roll } = getAngle(face);
  const degree = -roll * (180 / Math.PI);

  for (let i = x; i <= x + width; i += width * 0.25) {
    let size = getSize(width) * (sizeFactor || 1);
    let variance = size * (1 + imperfection);
    commands.push(`-draw '${getImperfectCircle(i, y, size, variance)}'`);
    size = getSize(width);
    variance = size * (1 + imperfection);
    commands.push(
      `-draw '${getImperfectCircle(i, y + height, size, variance)}'`
    );
  }
  return getRawDrawCommand(frame, commands, {
    fill: color,
    effects: `-distort ScaleRotateTranslate '${x},${y + height} 1 ${degree}'`
  });
};

module.exports = async (
  frame,
  { color = '#eeeeee', blur = 0.15, imperfection = 0.7, sizeFactor = 1 } = {}
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
        sizeFactor,
        imperfection
      })
    );
  }
};
