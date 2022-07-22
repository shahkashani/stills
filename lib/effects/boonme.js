const execCmd = require('../utils/exec-cmd');
const { getBoundingBox } = require('../utils/faces');
const geometric = require('geometric');

const STRETCH_FACTOR = 2;

const silhouette = [
  234, 127, 162, 21, 54, 103, 67, 109, 10, 338, 297, 332, 284, 251, 389, 356,
  454
];

const getOutline = (full, half, effects) => {
  const fullPolygon = getPolygon(full);
  const halfPolygon = getPolygon(half);
  return [
    {
      command: halfPolygon,
      effects
    },
    { command: fullPolygon }
  ];
};

const getCoords = (points) => {
  return points.map((point) => ({
    x: point[0],
    y: point[1]
  }));
};

const getPolygon = (points) => {
  return `polygon ${points.map(({ x, y }) => `${x},${y}`).join(' ')}`;
};

const stretchPolygon = (points) => {
  const bounds = geometric.polygonBounds(points);
  const centroid = geometric.polygonCentroid(points);
  const origin = [centroid[0], bounds[1][1]];
  return geometric.polygonScaleY(points, STRETCH_FACTOR, origin);
};

const getOutlineCmd = (
  frame,
  face,
  { imageWidth, imageHeight, blur, modulate, wave }
) => {
  const { file } = frame;

  const points = getCoords(face.annotations.silhouette);
  const half = getCoords(stretchPolygon(silhouette.map((i) => face.mesh[i])));

  const { width } = getBoundingBox(points);
  const finalBlur = Math.ceil(width * blur);
  const effects = wave ? `-background black -wave ${wave}` : '';

  const draws = getOutline(points, half, effects);

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
