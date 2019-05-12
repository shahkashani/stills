const canvas = require('canvas');
const faceapi = require('face-api.js');
const { resolve } = require('path');
const { writeFileSync, readFileSync } = require('fs');
const glob = require('glob');
const { map } = require('lodash');

const getWeightsFolder = () => {
  return resolve(__dirname, './weights');
};

const getFaceDetectionNet = () => {
  return faceapi.nets.ssdMobilenetv1;
};

const getFaceDetectionOptions = () => {
  return new faceapi.SsdMobilenetv1Options({ minConfidence: 0.7 });
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
  console.log(
    '📚 Initializing Tensorflow, get ready for some annoying warnings.'
  );
  require('@tensorflow/tfjs-node').disableDeprecationWarnings();
  await initWeights();
  initCanvas();
  this.initDone = true;
};

const saveDescriptors = (name, path, typedDescriptorArrays) => {
  const descriptorArrays = typedDescriptorArrays.map(typedArray =>
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

const loadDescriptors = path => {
  const string = readFileSync(path, 'utf-8').toString();
  const { name, descriptors } = JSON.parse(string);
  return {
    name,
    descriptors: descriptors.map(array => new Float32Array(array))
  };
};

const loadDescriptorsFolder = folder => {
  if (Array.isArray(folder)) {
    return folder.map(file => loadDescriptors(file));
  }
  return glob.sync(`${folder}/*.json`).map(file => loadDescriptors(file));
};

const trainFaces = async imagePaths => {
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

const findFaces = async image => {
  await init();
  return await getFaceDescriptors(getFaceDetectionOptions(), image);
};

const getLabeledDescriptors = descriptorNamePairs =>
  descriptorNamePairs.map(
    ({ name, descriptors }) =>
      new faceapi.LabeledFaceDescriptors(name, descriptors)
  );

const getFaces = async (file, avoidDescriptors = []) => {
  if (avoidDescriptors.length === 0) {
    return await findFaces(file);
  }
  const descriptors = loadDescriptorsFolder(avoidDescriptors);
  const names = map(descriptors, 'name');
  const faces = await recognizeFaces(file, descriptors);
  if (faces.length > 0 && names.length > 0) {
    console.log(`🙈 Found ${faces.length}, filtering out ${names.join(', ')}`);
  }
  return faces.filter(face => names.indexOf(face.recognition.label) === -1);
};

function getBoundingBox(pts, padding = 0) {
  const xs = pts.map(function(pt) {
    return pt.x;
  });
  const ys = pts.map(function(pt) {
    return pt.y;
  });

  const x = xs.reduce(function(min, x) {
    return x < min ? x : min;
  }, Infinity);

  const y = ys.reduce(function(min, y) {
    return y < min ? y : min;
  }, Infinity);

  const width =
    xs.reduce(function(max, x) {
      return max < x ? x : max;
    }, 0) - x;

  const height =
    ys.reduce(function(max, y) {
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
  trainFaces,
  loadDescriptorsFolder,
  saveDescriptors,
  loadDescriptors,
  findFaces,
  recognizeFaces,
  getBoundingBox,
  getFaces
};
