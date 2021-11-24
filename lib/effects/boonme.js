const execCmd = require('../utils/exec-cmd');
const { getBoundingBox } = require('../utils/faces');

const getOutlineCmd = (file, points, { blur, modulate }) => {
  const { width, x, y } = getBoundingBox(points);
  const finalBlur = Math.ceil(width * blur);
  const polygon = points.map(({ x, y }) => `${x},${y}`).join(' ');
  const maskBlur = `-blur 0x${finalBlur}`;
  const flip = `${x + width / 2},${y} 1 180`;
  const mask1 = `\\( +clone -threshold 100% -fill white -draw "polygon ${polygon}" ${maskBlur} \\) -channel-fx '| gray=>alpha'`;
  const mask2 = `\\( +clone -threshold 100% -fill white -draw "polygon ${polygon}" ${maskBlur} -distort ScaleRotateTranslate '${flip}' \\) -channel-fx '| gray=>alpha'`;
  const effect = `-modulate ${modulate},0`;
  const getMask = (mask) =>
    `\\( "${file}" ${mask} ${effect} -trim -alpha deactivate \\)`;
  return `${getMask(mask1)} ${getMask(mask2)}`;
};

module.exports = async (frame, { blur = 0.3, modulate = '-1000%' } = {}) => {
  const faces = await frame.getFaces();
  if (faces.length === 0) {
    return;
  }
  const masks = faces.map((face) =>
    getOutlineCmd(frame.file, face.landmarks.getJawOutline(), {
      blur,
      modulate
    })
  );
  execCmd(
    `convert "${frame.file}" ${masks.join(' ')} -flatten "${frame.file}"`
  );
};
