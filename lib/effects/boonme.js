const execCmd = require('../utils/exec-cmd');
const {
  getBoundingBox,
  getFallbackCoordinates,
  isAngled
} = require('../utils/faces');

const getFallbackOutline = (face, effects) => {
  const {
    width,
    height,
    center: { x, y }
  } = getFallbackCoordinates(face);
  const center = `${x},${y} `;
  const w = width * 0.5;
  const topHeight = height * 1.2;
  const bottomHeight = height * 0.8;
  return [
    {
      command: `ellipse ${center} ${w},${bottomHeight} 0,180`
    },
    {
      command: `push graphic-context translate ${x},${y} rotate 180 ellipse 0,0 ${w},${topHeight} 0,180 pop graphic-context`,
      effects
    }
  ];
};

const getOutline = (face, effects) => {
  const points = face.landmarks.getJawOutline();
  const { width, x, y } = getBoundingBox(points);
  const poly1 = `polygon ${points.map(({ x, y }) => `${x},${y}`).join(' ')}`;
  const poly2 = `polygon ${points
    .map(({ x: px, y: py }) => `${px - x},${py - y}`)
    .join(' ')}`;
  return [
    {
      command: poly1
    },
    {
      command: `push graphic-context translate ${
        x + width
      },${y} rotate 180 ${poly2} pop graphic-context`,
      effects
    }
  ];
};

const getOutlineCmd = (
  frame,
  face,
  useFallback,
  { imageWidth, imageHeight, blur, modulate, wave }
) => {
  const { file } = frame;
  const points = face.landmarks.getJawOutline();
  const { width } = getBoundingBox(points);
  const finalBlur = Math.ceil(width * blur);
  const effects = wave ? `-background black -wave ${wave}` : '';

  const draws = useFallback
    ? getFallbackOutline(face, effects)
    : getOutline(face, effects);

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

module.exports = async (
  frame,
  image,
  { blur = 0.3, modulate = '-1000%', wave = null } = {}
) => {
  const faces = await frame.getFaces();
  const { width: imageWidth, height: imageHeight } = image.getInfo();
  if (faces.length === 0) {
    return;
  }
  const masks = faces.map((face) => {
    const useFallback = isAngled(face);
    return getOutlineCmd(frame, face, useFallback, {
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
