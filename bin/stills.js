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

const makeReduceAwayDupes = originalFiles => newFiles => {
  console.log(`🔍 Comparing with ${originalFiles.length} Dropbox images.`);
  return newFiles.reduce((memo, newFile) => {
    if (originalFiles.indexOf(path.basename(newFile)) === -1) {
      memo.push(newFile);
    }
    return memo;
  }, []);
};

const deleteReduced = (originalFiles, newFiles) => {
  originalFiles.forEach(original => {
    if (newFiles.indexOf(original) === -1) {
      console.log(`❌ Deleting ${path.basename(original)}...`);
      fs.unlinkSync(original);
    }
  });
};

const noopReducer = files => {
  console.log(`👋 We're left with ${files.length} stills. Bye!`);
  return files;
};

screenshot
  .makeStills(glob, VIDEO_FOLDER, STILLS_FOLDER, num, 0.2, 0.8, [])
  .then(async files => {
    const tweeted = await dropbox.getTweetedFiles();
    const reducers = [
      {
        name: 'dupes',
        fn: makeReduceAwayDupes(_.map(tweeted, 'name'))
      }
    ];
    if (faces) {
      const makeProcessFaces = require('../lib/screenshot/make-process-faces');
      reducers.push({
        name: 'faces',
        fn: makeProcessFaces({
          minPercentFaces: faces,
          faceRecognitionModelFolder: FACES_FOLDER,
          faceRecognitionThreshold: accuracy
        })
      });
    }

    reducers.push({ name: 'Bye-bye', fn: noopReducer });

    let originalFiles = files.slice();
    for (const reducer of reducers) {
      console.log(`\n🐎 Running reducer: ${reducer.name}`);
      files = await reducer.fn(files);
      if (!Array.isArray(files)) {
        console.log(`Yo, your reducer (${reducer.name}) must return an array`);
        process.exit(1);
      }
      deleteReduced(originalFiles, files);
      originalFiles = files.slice();
    }
  })
  .catch(err => {
    console.log('Could not make stills!', err);
  });
