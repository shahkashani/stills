const canvas = require('canvas');
const faceapi = require('@vladmandic/face-api');
const { resolve } = require('path');
const { writeFileSync, readFileSync } = require('fs');
const glob = require('glob');
const {
  map,
  round,
  difference,
  sortBy,
  flattenDeep,
  range
} = require('lodash');
const bodyPix = require('@tensorflow-models/body-pix');
const tjfs = require('@tensorflow/tfjs-node');

const MIN_CONFIDENCE = 0.4;

global.ImageData = canvas.ImageData;

let bodyNetPromise;

const PARTS = {
  FACE: [0, 1],
  LEFT_FACE: [0],
  LEFT_RIGHT: [1],
  LEFT_HAND: [10],
  LEFT_ARM: [2, 3, 6, 7],
  RIGHT_ARM: [4, 5, 8, 9],
  ARMS: [2, 3, 4, 5, 6, 7, 8, 9],
  RIGHT_HAND: [11],
  HANDS: [10, 11],
  TORSO_FRONT: 12,
  TORSO_BACK: 13,
  TORSO: [12, 13],
  LEFT_LEG: [14, 15, 18, 19],
  RIGHT_LEG: [16, 17, 20, 21],
  LEGS: [14, 15, 16, 17, 18, 19, 20, 21],
  LEFT_FOOT: [22],
  RIGHT_FOOT: [23],
  FEET: [22, 23],
  BODY: [
    2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22,
    23
  ]
};

const roundTo = (number, interval) => {
  return round(number / interval) * interval;
};

const getFillFaceId = (face) => {
  const { x, width } = face.detection.box;
  const rounded = roundTo(x + width, 100);
  return `face-${rounded}`;
};

const findFillFace = (frames, faceId, startIndex) => {
  console.log(`🕵️‍♀️  Looking for face ${faceId}...`);
  for (let i = startIndex; i >= 0; i--) {
    const found = frames[i].find((face) => faceId === getFillFaceId(face));
    if (found) {
      return found;
    }
  }
};

const fillFaces = (faces) => {
  const results = { ...faces };
  const values = Object.values(faces);
  const ids = values.reduce((memo, fs, i) => {
    fs.forEach((face) => {
      const id = getFillFaceId(face);
      memo[id] = {
        start: memo[id] ? memo[id].start : i,
        end: i
      };
    });
    return memo;
  }, {});

  console.log(`🕵️‍♀️  Stats:`, JSON.stringify(ids, null, 2));

  const keys = Object.keys(ids);
  const map = {};
  for (let i = 0; i < values.length; i++) {
    map[i] = [];
    keys.forEach((faceId) => {
      const { start, end } = ids[faceId];
      if (i >= start && i <= end) {
        map[i].push(faceId);
      }
    });
  }

  values.forEach((faces, i) => {
    const ids = faces.map((face) => getFillFaceId(face));
    const missing = difference(map[i], ids);
    if (missing.length > 0) {
      console.log(`🕵️‍♀️  In frame ${i}, missing`, missing.join(', '));
      missing.forEach((mid) => {
        const foundFace = findFillFace(values, mid, i);
        if (foundFace) {
          console.log('🕵️‍♀️  Found one of them!');
          results[i].push(foundFace);
        }
      });
    }
  });

  return results;
};

const getWeightsFolder = () => {
  return resolve(__dirname, './weights');
};

const getFaceDetectionNet = () => {
  return faceapi.nets.ssdMobilenetv1;
};

const getFaceDetectionOptions = () => {
  return new faceapi.SsdMobilenetv1Options({ minConfidence: MIN_CONFIDENCE });
};

const initCanvas = () => {
  const { Canvas, Image, ImageData } = canvas;
  faceapi.env.monkeyPatch({ Canvas, Image, ImageData });
};

const initWeights = async () => {
  const folder = getWeightsFolder();
  const faceDetectionNet = getFaceDetectionNet();
  await faceDetectionNet.loadFromDisk(folder);
  await faceapi.nets.faceLandmark68Net.loadFromDisk(folder);
  await faceapi.nets.faceRecognitionNet.loadFromDisk(folder);
};

const init = async () => {
  if (this.initDone) {
    return;
  }
  await initWeights();
  initCanvas();
  this.initDone = true;
};

const saveDescriptors = (name, path, typedDescriptorArrays) => {
  const descriptorArrays = typedDescriptorArrays.map((typedArray) =>
    Array.from(typedArray)
  );
  writeFileSync(
    path,
    JSON.stringify({
      name,
      descriptors: descriptorArrays
    })
  );
};

const loadDescriptors = (path) => {
  const string = readFileSync(path, 'utf-8').toString();
  const { name, descriptors } = JSON.parse(string);
  return {
    name,
    descriptors: descriptors.map((array) => new Float32Array(array))
  };
};

const loadDescriptorsFolder = (folder) => {
  if (Array.isArray(folder)) {
    return folder.map((file) => loadDescriptors(file));
  }
  return glob.sync(`${folder}/*.json`).map((file) => loadDescriptors(file));
};

const trainFaces = async (imagePaths) => {
  await init();

  const faceDetectionOptions = getFaceDetectionOptions();
  const descriptors = await imagePaths.reduce(
    async (memoPromise, imagePath) => {
      const memo = await memoPromise;
      const image = await canvas.loadImage(imagePath);
      const results = await faceapi
        .detectSingleFace(image, faceDetectionOptions)
        .withFaceLandmarks()
        .withFaceDescriptor();
      if (results) {
        return [...memo, results.descriptor];
      }
      return memo;
    },
    Promise.resolve([])
  );

  return descriptors;
};

const getFaceDescriptors = async (faceDetectionOptions, imagePath) => {
  const queryImage = await canvas.loadImage(imagePath);

  return await faceapi
    .detectAllFaces(queryImage, faceDetectionOptions)
    .withFaceLandmarks()
    .withFaceDescriptors();
};

const recognizeFaces = async (
  image,
  descriptorNamePairs,
  includeUnknown = true
) => {
  await init();

  const faceMatcher = new faceapi.FaceMatcher(
    getLabeledDescriptors(descriptorNamePairs)
  );

  const results = await getFaceDescriptors(getFaceDetectionOptions(), image);

  return results.reduce((memo, result) => {
    const bestMatch = faceMatcher.findBestMatch(result.descriptor);
    if (bestMatch && (includeUnknown || bestMatch.label !== 'unknown')) {
      result.recognition = bestMatch;
      memo.push(result);
    }
    return memo;
  }, []);
};

const findFaces = async (image) => {
  await init();
  return await getFaceDescriptors(getFaceDetectionOptions(), image);
};

const getBodyColors = (parts) => {
  const flat = flattenDeep(parts || []);
  if (flat.length === 0) {
    return range(0, 24).map(() => [0, 0, 0]);
  }
  const colors = range(0, 24).map(() => [255, 255, 255]);
  flat.forEach((index) => {
    colors[index] = [0, 0, 0];
  });
  return colors;
};

const getBodyNet = async () => {
  if (bodyNetPromise) {
    return bodyNetPromise;
  }
  bodyNetPromise = bodyPix.load();
  return bodyNetPromise;
};

const getBodyMap = async (
  imagePath,
  segmentationThreshold = 0.7,
  parts = [],
  internalResolution = 'high',
  refineSteps = 20
) => {
  const net = await getBodyNet();
  const file = await readFileSync(imagePath);
  const imageData = await tjfs.node.decodeImage(file, 3);
  const segments = await net.segmentMultiPersonParts(imageData, {
    segmentationThreshold,
    internalResolution,
    refineSteps,
    scoreThreshold: 0.4,
    nmsRadius: 20,
    minKeypointScore: 0.3,
    flipHorizontal: false
  });
  return bodyPix.toColoredPartMask(segments, getBodyColors(parts));
};

const getLabeledDescriptors = (descriptorNamePairs) =>
  descriptorNamePairs.map(
    ({ name, descriptors }) =>
      new faceapi.LabeledFaceDescriptors(name, descriptors)
  );

const getRawFaces = async (file, avoidDescriptors = []) => {
  if (!avoidDescriptors || avoidDescriptors.length === 0) {
    return await findFaces(file);
  }
  const descriptors = loadDescriptorsFolder(avoidDescriptors);
  const names = map(descriptors, 'name');
  const faces = await recognizeFaces(file, descriptors);
  if (faces.length > 0 && names.length > 0) {
    console.log(`🙈 Found ${faces.length}, filtering out ${names.join(', ')}`);
  }
  return faces.filter((face) => names.indexOf(face.recognition.label) === -1);
};

const getFaces = async (file, avoidDescriptors = []) => {
  const faces = await getRawFaces(file, avoidDescriptors);
  return sortBy(faces, (face) => face.detection.box.x);
};

function getBoundingBox(pts, padding = 0) {
  const xs = pts.map(function (pt) {
    return pt.x;
  });
  const ys = pts.map(function (pt) {
    return pt.y;
  });

  const x = xs.reduce(function (min, x) {
    return x < min ? x : min;
  }, Infinity);

  const y = ys.reduce(function (min, y) {
    return y < min ? y : min;
  }, Infinity);

  const width =
    xs.reduce(function (max, x) {
      return max < x ? x : max;
    }, 0) - x;

  const height =
    ys.reduce(function (max, y) {
      return max < y ? y : max;
    }, 0) - y;

  const paddingX = width * padding;
  const paddingY = height * padding;

  return {
    x: x - paddingX,
    y: y - paddingY,
    width: width + paddingX * 2,
    height: height + paddingY * 2
  };
}

module.exports = {
  PARTS,
  trainFaces,
  loadDescriptorsFolder,
  saveDescriptors,
  loadDescriptors,
  findFaces,
  recognizeFaces,
  getBoundingBox,
  getFaces,
  fillFaces,
  getBodyMap
};
