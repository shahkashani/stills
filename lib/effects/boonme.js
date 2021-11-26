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
  return [
    {
      command: `ellipse ${center} ${w},${height * 0.8} 0,180`
    },
    {
      command: `ellipse ${center} ${w},${height * 1.4} 0,180`,
      effects: `${effects} -distort ScaleRotateTranslate '${x},${y} 1 180'`
    }
  ];
};

const getOutlineCmd = (file, face, useFallback, { blur, modulate, wave }) => {
  const points = face.landmarks.getJawOutline();
  const { width, x, y } = getBoundingBox(points);
  const finalBlur = Math.ceil(width * blur);
  const polygon = points.map(({ x, y }) => `${x},${y}`).join(' ');
  const waveC = wave ? `-background none -wave ${wave}` : '';
  const centerX = x + width / 2;
  const draws = useFallback
    ? getFallbackOutline(face, waveC)
    : [
        {
          command: `polygon ${polygon}`
        },
        {
          command: `polygon ${polygon}`,
          effects: `${waveC} -distort ScaleRotateTranslate '${centerX},${y} 1 180'`
        }
      ];

  const masks = draws.map(({ command, effects = '' }) => {
    const mask = `\\( +clone -threshold 100% -fill white -draw "${command}" -blur 0x${finalBlur} ${effects} \\) -channel-fx '| gray=>alpha'`;
    return `\\( "${file}" ${mask} -modulate ${modulate},0 -alpha deactivate \\)`;
  });

  return `\\( ${masks.join(' ')} -background none -flatten \\)`;
};

module.exports = async (
  frame,
  { blur = 0.1, modulate = '-1000%', wave = null } = {}
) => {
  const { file } = frame;
  const faces = await frame.getFaces();
  if (faces.length === 0) {
    return;
  }
  const masks = faces.map((face) => {
    const useFallback = isAngled(face);
    return getOutlineCmd(file, face, useFallback, {
      blur,
      modulate,
      wave
    });
  });
  execCmd(
    `convert "${frame.file}" ${masks.join(' ')} -flatten "${frame.file}"`
  );
};
