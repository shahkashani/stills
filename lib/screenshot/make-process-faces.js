const fr = require('face-recognition');
const detector = fr.FaceDetector();
const recognizer = fr.FaceRecognizer();
const path = require('path');
const glob = require('glob');

const processFaces = async (options, files) => {
  const remainingFiles = [];

  const {
    minPercentFaces,
    faceRecognitionModelFolder,
    faceRecognitionThreshold
  } = options;

  const faces = faceRecognitionModelFolder
    ? glob.sync(`${faceRecognitionModelFolder}/*.json`)
    : null;
  const useRecognizer = faces && faces.length > 0;

  console.log(`\nProcessing faces ${JSON.stringify(options)}`);

  if (useRecognizer) {
    for (const face of faces) {
      console.log(`Using recognizer ${path.basename(face)}...`);
      recognizer.load(require(face));
    }
  }

  for (const file of files) {
    try {
      const img = fr.loadImage(file);
      const faceRects = detector.locateFaces(img).map(res => res.rect);
      const isFace = faceRects.length > 0;
      let isPass = isFace;

      if (isFace) {
        if (useRecognizer) {
          const faces = detector.getFacesFromLocations(img, faceRects, 150);
          const desiredFaces = faces.reduce((memo, face) => {
            const prediction = recognizer.predictBest(
              face,
              faceRecognitionThreshold / 100
            );
            if (prediction.className !== 'unknown') {
              memo.push(prediction.className);
            }
            return memo;
          }, []);
          if (desiredFaces.length > 0) {
            console.log(`${file}: Found a face: ${desiredFaces.join(', ')}`);
          } else {
            console.log(`${file}: Found a face, but not a trained one.`);
            isPass = false;
          }
        } else {
          console.log(`${file}: Found a face.`);
        }
      } else {
        console.log(`${file}: Not a face.`);
      }

      if (isPass) {
        remainingFiles.push(file);
      } else {
        if (Math.random() < minPercentFaces / 100) {
          console.log(`\tDeleting.`);
        } else {
          console.log(`\tKeeping.`);
          remainingFiles.push(file);
        }
      }
    } catch (err) {
      console.log(`Errored: ${err}`);
      remainingFiles.push(file);
    }
  }

  return remainingFiles;
};

module.exports = options => files => processFaces(options, files);
