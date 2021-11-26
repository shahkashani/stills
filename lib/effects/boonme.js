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

const getOutline = (face, effects) => {
  const points = face.landmarks.getJawOutline();
  const { width, height, x, y } = getBoundingBox(points);
  const command = `polygon ${points.map(({ x, y }) => `${x},${y}`).join(' ')}`;
  const centerX = x + width / 2;
  const headStartY = y - height;
  const useEffects = headStartY > 0 ? effects : '';
  if (y > 0 && x > 0) {
    return [
      {
        command
      },
      {
        command,
        effects: `${useEffects} -distort ScaleRotateTranslate '${centerX},${y} 1 180'`
      }
    ];
  } else {
    return [
      {
        command
      }
    ];
  }
};

const getOutlineCmd = (file, face, useFallback, { blur, modulate, wave }) => {
  const points = face.landmarks.getJawOutline();
  const { width } = getBoundingBox(points);
  const finalBlur = Math.ceil(width * blur);
  const effects = wave ? `-background none -wave ${wave}` : '';

  const draws = useFallback
    ? getFallbackOutline(face, effects)
    : getOutline(face, effects);

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

/*
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
*/
