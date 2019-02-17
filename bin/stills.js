#! /usr/bin/env node
require('dotenv').config();

const path = require('path');
const _ = require('lodash');
const fs = require('fs');
const screenshot = require('../lib/screenshot');
const dropbox = require('../lib/dropbox');
const glob = require('glob');

const argv = require('yargs')
  .usage('Usage: $0 <command> [options]')
  .default('num', 5)
  .default('accuracy', 60)
  .describe(
    'faces',
    '0-100, how many percentage of images should include faces'
  )
  .describe(
    'accuracy',
    '0-100, how close the face should be to the trained model'
  ).argv;

const VIDEO_FOLDER = path.resolve('./videos');
const STILLS_FOLDER = path.resolve('./stills');
const FACES_FOLDER = path.resolve('./faces');

const faces = argv.faces;
const accuracy = argv.accuracy;
const num = argv.num;

const deleteDupes = async (existingFiles, newFiles) => {
  const dupes = _.intersection(existingFiles, newFiles);
  dupes.forEach(dupe => {
    fs.unlinkSync(`${STILLS_FOLDER}/${dupe}`);
  });
  return dupes;
};

const processFaces = async (facesRate, files) => {
  const fr = require('face-recognition');
  const detector = fr.FaceDetector();
  const recognizer = fr.FaceRecognizer();
  const remainingFiles = [];
  const deleteChance = facesRate / 100;
  const faces = glob.sync(`${FACES_FOLDER}/*.json`);
  const useRecognizer = faces.length > 0;
  console.log(`\nProcessing faces at ${facesRate}% (accuracy: ${accuracy})`);

  if (useRecognizer) {
    for (const face of faces) {
      console.log(`Using recognizer ${path.basename(face)}...`);
      recognizer.load(require(face));
    }
  }

  for (const file of files) {
    const path = `${STILLS_FOLDER}/${file}`;
    try {
      const img = fr.loadImage(path);
      const faceRects = detector.locateFaces(img).map(res => res.rect);
      const isFace = faceRects.length > 0;
      let isPass = isFace;

      if (isFace) {
        if (useRecognizer) {
          const faces = detector.getFacesFromLocations(img, faceRects, 150);
          const desiredFaces = faces.reduce((memo, face) => {
            const prediction = recognizer.predictBest(face, accuracy / 100);
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
        if (Math.random() < deleteChance) {
          console.log(`\tDeleting.`);
          fs.unlinkSync(path);
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

console.log(`Stills: ${num}`);
if (faces) {
  console.log(`Faces: ${faces}% (${accuracy}% similarity to trained models)`);
}
console.log();

screenshot
  .makeStills(
    '**/*.{mp4,avi,mov,mkv}',
    VIDEO_FOLDER,
    STILLS_FOLDER,
    num,
    0.2,
    0.8,
    []
  )
  .then(async files => {
    console.log(`Done making ${files.length} stills!`);

    const faceProcessed = faces ? await processFaces(faces, files) : files;
    const tweeted = await dropbox.getTweetedFiles();
    const tweetedNames = _.map(tweeted, 'name');
    const dupes = await deleteDupes(tweetedNames, faceProcessed);
    if (dupes.length > 0) {
      console.log('Deleting dupes', dupes);
    } else {
      console.log('...and no dupes!');
    }
  })
  .catch(err => {
    console.log('Could not make stills!', err);
  });
