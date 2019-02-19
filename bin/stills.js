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
  .default('accuracy', 60)
  .default('glob', '**/*.{mp4,avi,mov,mkv}')
  .describe(
    'faces',
    '0-100, how many percentage of images should include faces'
  )
  .describe(
    'accuracy',
    '0-100, how close the face should be to the trained model'
  )
  .describe('glob', 'Glob describing what videos to process').argv;

const VIDEO_FOLDER = path.resolve('./videos');
const STILLS_FOLDER = path.resolve('./stills');
const FACES_FOLDER = path.resolve('./faces');

const { faces, accuracy, num, glob } = argv;

const deleteDupes = async (existingFiles, newFiles) => {
  const dupes = _.intersection(
    existingFiles.map(e => `${STILLS_FOLDER}/${e}`),
    newFiles
  );
  dupes.forEach(dupe => {
    fs.unlinkSync(dupe);
  });
  return dupes;
};

console.log(`Stills: ${num}`);
if (faces) {
  console.log(`Faces: ${faces}% (${accuracy}% similarity to trained models)`);
}
console.log();

screenshot
  .makeStills(glob, VIDEO_FOLDER, STILLS_FOLDER, num, 0.2, 0.8, [])
  .then(async files => {
    console.log(`Done making ${files.length} stills!`);

    if (faces) {
      files = await require('../lib/screenshot/process-faces')(files, {
        minPercentFaces: faces,
        faceRecognitionModelFolder: FACES_FOLDER,
        faceRecognitionThreshold: accuracy
      });
    }

    const tweeted = await dropbox.getTweetedFiles();
    const tweetedNames = _.map(tweeted, 'name');
    const dupes = await deleteDupes(tweetedNames, files);

    if (dupes.length > 0) {
      console.log('Deleting dupes', dupes);
    } else {
      console.log('...and no dupes!');
    }
  })
  .catch(err => {
    console.log('Could not make stills!', err);
  });
