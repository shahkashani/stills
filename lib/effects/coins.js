const execCmd = require('../utils/exec-cmd');
const { getBoundingBox } = require('../utils/faces');
const getRawDrawCommand = require('../utils/get-raw-draw-command');

const getFeaturesCmd = (frame, pointSets, { size, fill, blur }) => {
  const commands = pointSets.map((pointSet) => {
    const { x, y } = getBoundingBox(pointSet);
    const startX = x + size / 2;
    const startY = y + size / 2;
    return `-draw 'circle ${startX},${startY} ${startX},${startY + size}'`;
  });
  return getRawDrawCommand(frame, commands, {
    fill,
    effects: `-blur 0x${size * blur}`
  });
};
module.exports = async (frame, { fill = '#eeeeee', blur = 0.15 } = {}) => {
  const faces = await frame.getFaces();
  if (faces.length === 0) {
    return;
  }
  for (const face of faces) {
    const bounds = getBoundingBox(face.landmarks.getLeftEye());
    const size = Math.min(bounds.width, bounds.height);
    execCmd(
      getFeaturesCmd(
        frame,
        [face.landmarks.getLeftEye(), face.landmarks.getRightEye()],
        { size, fill, blur }
      )
    );
  }
};
