#! /usr/bin/env node
require('dotenv').config();

const path = require('path');
const _ = require('lodash');
const fs = require('fs');
const screenshot = require('../lib/screenshot');
const dropbox = require('../lib/dropbox');
const globSync = require('glob').sync;

const argv = require('yargs')
  .usage('Usage: $0 <command> [options]')
  .default('num', 5)
  .default('glob', '**/*.{mp4,avi,mov,mkv}')
  .describe('num', 'How many stills per video to generate')
  .describe('faces', '0-100, what percentage of images should include faces')
  .describe('captions', '0-100, what percentage of images should be captioned')
  .describe('glob', 'Glob describing what videos to process').argv;

const VIDEO_FOLDER = path.resolve('./videos');
const STILLS_FOLDER = path.resolve('./stills');
const FACES_FOLDER = path.resolve('./faces');
const CAPTIONS_FOLDER = path.resolve('./captions');

const { num, glob, faces, captions } = argv;

const makeReduceAwayDupes = originalFiles => newFiles => {
  console.log(`🔍 Comparing with ${originalFiles.length} Dropbox images.`);
  return newFiles.reduce((memo, newFile) => {
    if (originalFiles.indexOf(path.basename(newFile)) === -1) {
      memo.push(newFile);
    }
    return memo;
  }, []);
};

const makeFaceFinder = options => {
  const { findFaces } = require('../lib/face-detection');
  const { minPercentMatches } = options;
  const minRateMatches = minPercentMatches / 100;

  return async files => {
    const result = await findFaces(files);
    console.log('📕', result);
    return files.filter(
      file => result[file] || Math.random() >= minRateMatches
    );
  };
};

const makeFaceRecognizer = options => {
  const { recognizeFaces, loadDescriptors } = require('../lib/face-detection');
  const { descriptorFiles, minPercentMatches } = options;
  const minRateMatches = minPercentMatches / 100;

  const descriptorNamePairs = descriptorFiles.map(file => ({
    name: path.basename(file, '.json'),
    descriptors: loadDescriptors(file)
  }));

  return async files => {
    const result = await recognizeFaces(descriptorNamePairs, files);
    console.log('📒', result);
    return files.filter(
      file => result[file].length > 0 || Math.random() >= minRateMatches
    );
  };
};

const getFaceReducer = options => {
  const descriptorFiles = globSync(`${FACES_FOLDER}/*.json`);
  if (descriptorFiles.length > 0) {
    return {
      name: 'face-recognizer',
      fn: makeFaceRecognizer({
        descriptorFiles,
        ...options
      })
    };
  } else {
    return {
      name: 'face-finder',
      fn: makeFaceFinder(options)
    };
  }
};

const getCaptionReducer = options => {
  const makeAddCaption = require('../lib/screenshot/make-add-caption');
  return {
    name: 'captions',
    fn: makeAddCaption({
      captionsFolder: CAPTIONS_FOLDER,
      ...options
    })
  };
};

const deleteReduced = (originalFiles, newFiles) => {
  originalFiles.forEach(original => {
    if (newFiles.indexOf(original) === -1) {
      console.log(`❌ Deleting ${path.basename(original)}...`);
      try {
        fs.unlinkSync(original);
      } catch (err) {
        console.log('❌ Oops', err);
      }
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
    const reducers = [];

    if (dropbox.canConnect()) {
      const posted = await dropbox.getPostedFiles();
      reducers.push({
        name: 'dupes',
        fn: makeReduceAwayDupes(_.map(posted, 'name'))
      });
    }

    if (faces) {
      reducers.push(getFaceReducer({ minPercentMatches: faces }));
    }

    if (captions) {
      reducers.push(
        getCaptionReducer({
          minPercentCaptions: captions
        })
      );
    }

    reducers.push({ name: 'Bye-bye', fn: noopReducer });

    let originalFiles = files.slice();
    for (const reducer of reducers) {
      console.log(`\n🐎 Running reducer: ${reducer.name}`);
      files = await reducer.fn(files);
      if (!Array.isArray(files)) {
        console.log(
          `👿 Yo, your reducer (${reducer.name}) must return an array`
        );
        console.log('👿 Instead I got:', files);
        process.exit(1);
      }
      deleteReduced(originalFiles, files);
      originalFiles = files.slice();
    }
  })
  .catch(err => {
    console.log('😡 Could not make stills!', err);
  });
