#! /usr/bin/env node
require('dotenv').config();

const path = require('path');
const _ = require('lodash');
const fs = require('fs');
const screenshot = require('../lib/screenshot');
const dropbox = require('../lib/dropbox');

const argv = require('yargs')
  .usage('Usage: $0 <command> [options]')
  .default('num', 5)
  .describe(
    'faces',
    '0-100, how many percentage of images should include faces'
  ).argv;

const VIDEO_FOLDER = path.resolve('./videos');
const STILLS_FOLDER = path.resolve('./stills');

const faces = argv.faces;
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
  const remainingFiles = [];
  const deleteChance = facesRate / 100;

  console.log(`\nProcessing faces at ${facesRate}%`);

  for (const file of files) {
    const path = `${STILLS_FOLDER}/${file}`;
    const image = fr.loadImage(path);

    const faceRectangles = detector.locateFaces(image);

    const isFace = faceRectangles.length > 0;

    if (!isFace) {
      if (Math.random() < deleteChance) {
        console.log(`${file}: Not a face, deleting.`);
        fs.unlinkSync(path);
      } else {
        console.log(`${file}: Not a face, but keeping.`);
        remainingFiles.push(file);
      }
    } else {
      remainingFiles.push(file);
    }
  }

  return remainingFiles;
};

console.log(`Stills: ${num}`);
if (faces) {
  console.log(`Faces: ${faces}%`);
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
