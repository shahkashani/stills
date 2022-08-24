const execCmd = require('../utils/exec-cmd');
const getBoundingBox = require('../utils/get-bounding-box');
const geometric = require('geometric');
const gm = require('gm').subClass({ imageMagick: true });

const { flatten } = require('lodash');
const STRETCH_FACTOR = 1.8;
const MASK_FACTOR = 1.3;

const silhouette = [
  234, 127, 162, 21, 54, 103, 67, 109, 10, 338, 297, 332, 284, 251, 389, 356,
  454
];

const getPolygon = (points) =>
  `polygon ${points.map((p) => `${p[0]},${p[1]}`).join(' ')}`;

const stretchPolygon = (points) => {
  const bounds = geometric.polygonBounds(points);
  const centroid = geometric.polygonCentroid(points);
  const origin = [centroid[0], bounds[1][1]];
  return geometric.polygonScaleY(points, STRETCH_FACTOR, origin);
};

const getExtendedEffects = (effects, { width, height }) => {
  if (MASK_FACTOR === 1) {
    return effects;
  }
  const imageSize = `${width}x${height}`;
  const maskSize = `${Math.round(width * MASK_FACTOR)}x${Math.round(
    height * MASK_FACTOR
  )}`;
  return [
    ['-gravity', 'center'],
    ['-background', 'black'],
    ['-extent', maskSize],
    ...effects,
    ['-crop', `${imageSize}+0+0`]
  ];
};

const getEffects = (blur, wave, options) => {
  const blurArray = blur ? [['-blur', `0x${blur}`]] : [];
  const waveArray = wave
    ? [
        ['-background', 'black'],
        ['-wave', wave]
      ]
    : [];
  const effects = [...blurArray, ...waveArray];
  return wave ? getExtendedEffects(effects, options) : effects;
};

const getBlur = (blur, width) => Math.ceil(width * blur);

const getWave = (width) => {
  const wave1 = (5 / 540) * width;
  const wave2 = (25 / 540) * width;
  return `${Math.round(wave1)}x${Math.round(wave2)}`;
};

const getSingleCommand = (file, polygon, effects) => {
  const mask = [
    ['('],
    ['+clone'],
    ['-threshold', '100%'],
    ['-fill', 'white'],
    ['-draw', polygon],
    ...effects,
    [')'],
    ['-channel-fx', '| gray=>alpha']
  ];

  return [
    ['('],
    [file],
    ...mask,
    ['-modulate', '-1000%,0'],
    ['-alpha', 'deactivate'],
    [')']
  ];
};

const getOutlineCmd = (
  frame,
  face,
  { width, height, blur: blurRatio, wave }
) => {
  const { file } = frame;
  const points1 = face.annotations.silhouette;
  const points2 = stretchPolygon(silhouette.map((i) => face.mesh[i]));
  const polygon1 = getPolygon(points1);
  const polygon2 = getPolygon(points2);
  const { width: boxWidth } = getBoundingBox(points1);
  const blur = getBlur(blurRatio, boxWidth);
  const effectsOptions = {
    width,
    height
  };
  const effects1 = getEffects(blur, null, effectsOptions);
  const effects2 = getEffects(blur, wave, effectsOptions);
  const commands = [
    ...getSingleCommand(file, polygon1, effects1),
    ...getSingleCommand(file, polygon2, effects2)
  ];
  return commands;
};

module.exports = async (frame, image, { blur = 0.3, useWave = false } = {}) => {
  const result = await frame.detectHumans();
  const faces = result.face;
  const { width, height } = image.getInfo();
  const wave = useWave ? getWave(width) : null;

  if (faces.length === 0) {
    return;
  }
  const masks = faces.map((face) => {
    return getOutlineCmd(frame, face, {
      width,
      height,
      blur,
      wave
    });
  });

  return new Promise((resolve, reject) => {
    let base = gm(frame.file).command('convert');

    flatten(masks).forEach((cmd) => {
      base = base.out(...cmd);
    });

    base.out('-flatten').write(frame.file, (err) => {
      if (err) {
        return reject(err);
      }
      resolve();
    });
  });

  execCmd(
    `convert "${frame.file}" ${masks.join(' ')} -flatten "${frame.file}"`
  );
};
