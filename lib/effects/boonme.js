const execCmd = require('../utils/exec-cmd');
const { getBoundingBox } = require('../utils/faces');

const Y_OFFSET = 0.8;

const getOutline = (points, effects) => {
  const poly1 = `polygon ${points
    .map(({ x, y }) => `${x},${y * Y_OFFSET}`)
    .join(' ')}`;
  const poly2 = `polygon ${points.map(({ x, y }) => `${x},${y}`).join(' ')}`;
  return [
    {
      command: poly1,
      effects
    },
    {
      command: poly2
    }
  ];
};

const getOutlineCmd = (
  frame,
  face,
  { imageWidth, imageHeight, blur, modulate, wave }
) => {
  const { file } = frame;
  const points = face.annotations.silhouette.map((point) => ({
    x: point[0],
    y: point[1]
  }));
  const { width } = getBoundingBox(points);
  const finalBlur = Math.ceil(width * blur);
  const effects = wave ? `-background black -wave ${wave}` : '';

  const draws = getOutline(points, effects);

  const maskFactor = 1.5;
  const maskSize = `${Math.round(imageWidth * maskFactor)}x${Math.round(
    imageHeight * maskFactor
  )}`;
  const imageSize = `${imageWidth}x${imageHeight}`;

  const masks = draws.map(({ command, effects = '' }, i) => {
    const extendMask = effects
      ? `-gravity center -background black -extent ${maskSize} -blur 0x${finalBlur} ${effects} -crop ${imageSize}+0+0`
      : `-blur 0x${finalBlur}`;
    const bw = `"${file}" -threshold 100% -fill white -draw "${command}" ${extendMask}`;
    const mask = `\\( ${bw} \\) -channel-fx '| gray=>alpha'`;
    return `\\( "${file}" ${mask} -modulate ${modulate},0 -alpha deactivate \\)`;
  });

  return `\\( ${masks.join(' ')} -background none -flatten \\)`;
};

const getWave = (width) => {
  const wave1 = (5 / 540) * width;
  const wave2 = (25 / 540) * width;
  return `${Math.round(wave1)}x${Math.round(wave2)}`;
};

module.exports = async (
  frame,
  image,
  { blur = 0.2, modulate = '-1000%', useWave = false } = {}
) => {
  const result = await frame.detectHumans();
  const faces = result.face;
  const { width: imageWidth, height: imageHeight } = image.getInfo();
  const wave = useWave ? getWave(imageWidth) : null;

  if (faces.length === 0) {
    return;
  }
  const masks = faces.map((face) => {
    return getOutlineCmd(frame, face, {
      imageWidth,
      imageHeight,
      blur,
      modulate,
      wave
    });
  });
  execCmd(
    `convert "${frame.file}" ${masks.join(' ')} -flatten "${frame.file}"`
  );
};
