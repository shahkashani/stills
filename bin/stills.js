#! /usr/bin/env node
require('dotenv').config();

const screenshot = require('../lib/screenshot');
const dropbox = require('../lib/dropbox');

const path = require('path');
const VIDEO_FOLDER = path.resolve('../videos');
const STILLS_FOLDER = path.resolve('../stills');

const _ = require('lodash');
const fs = require('fs');

const globArg = process.argv[2];
const globPattern = globArg
  ? `**/${globArg}*.{mp4,avi,mov}`
  : '**/*.{mp4,avi,mov}';
const count = parseInt(process.argv[3], 10) || 4;
const min = parseFloat(process.argv[4]) || 0.2;
const max = parseFloat(process.argv[5]) || 0.8;
const timestamps = process.argv[6]
  ? process.argv[6].split(',').map(pos => parseFloat(pos))
  : [];

const deleteDupes = (existingFiles, newFiles) => {
  return new Promise((resolve, reject) => {
    const dupes = _.intersection(existingFiles, newFiles);
    dupes.forEach(dupe => {
      fs.unlinkSync(`${STILLS_FOLDER}/${dupe}`);
    });
    resolve(dupes);
  });
};

screenshot
  .makeStills(
    globPattern,
    VIDEO_FOLDER,
    STILLS_FOLDER,
    count,
    min,
    max,
    timestamps
  )
  .then(files => {
    console.log(`Done making ${files.length} stills!`);

    dropbox.getTweetedFiles().then(tweeted => {
      deleteDupes(_.map(tweeted, 'name'), files).then(dupes => {
        if (dupes.length > 0) {
          console.log('Deleting dupes', dupes);
        } else {
          console.log('...and no dupes!');
        }
      });
    });
  })
  .catch(err => {
    console.log('Could not make stills!', err);
  });
