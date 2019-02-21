const canvas = require('canvas');
const faceapi = require('face-api.js');
const path = require('path');
const fs = require('fs');

const getWeightsFolder = () => {
  return path.resolve(__dirname, './weights');
};

const getFaceDetectionNet = () => {
  return faceapi.nets.ssdMobilenetv1;
};

const getFaceDetectionOptions = () => {
  return new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 });
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
  console.log(
    '📚 Initializing Tensorflow, get ready for some annoying warnings.'
  );
  require('@tensorflow/tfjs-node').disableDeprecationWarnings();

  await initWeights();
  initCanvas();
};

const saveDescriptors = (path, typedDescriptorArrays) => {
  const descriptorArrays = typedDescriptorArrays.map(typedArray =>
    Array.from(typedArray)
  );
  fs.writeFileSync(path, JSON.stringify(descriptorArrays));
};

const loadDescriptors = path => {
  const descriptorString = fs.readFileSync(path, 'utf-8').toString();
  const descriptorArrays = JSON.parse(descriptorString);
  return descriptorArrays.map(array => new Float32Array(array));
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

const recognizeFaces = async (descriptorNamePairs, imagePaths) => {
  await init();

  const faceMatcher = new faceapi.FaceMatcher(
    getLabeledDescriptors(descriptorNamePairs)
  );

  const faceDetectionOptions = getFaceDetectionOptions();

  return await imagePaths.reduce(async (memoPromise, imagePath) => {
    const memo = await memoPromise;
    const results = await getFaceDescriptors(faceDetectionOptions, imagePath);
    const faces = results.reduce((memo, result) => {
      const bestMatch = faceMatcher.findBestMatch(result.descriptor);
      if (bestMatch && bestMatch.label !== 'unknown') {
        memo.push(bestMatch.toString());
      }
      return memo;
    }, []);
    memo[imagePath] = faces;
    return memo;
  }, Promise.resolve({}));
};

const findFaces = async imagePaths => {
  const faceDetectionOptions = getFaceDetectionOptions();

  await init();

  return await imagePaths.reduce(async (memoPromise, imagePath) => {
    const memo = await memoPromise;
    const results = await getFaceDescriptors(faceDetectionOptions, imagePath);
    memo[imagePath] = results.length > 0;
    return memo;
  }, Promise.resolve({}));
};

const getLabeledDescriptors = descriptorNamePairs =>
  descriptorNamePairs.map(
    ({ name, descriptors }) =>
      new faceapi.LabeledFaceDescriptors(name, descriptors)
  );

module.exports = {
  trainFaces,
  saveDescriptors,
  loadDescriptors,
  findFaces,
  recognizeFaces
};
