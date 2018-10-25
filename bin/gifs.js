#! /usr/bin/env node
require('dotenv').config();

const screenshot = require('../lib/screenshot');

const path = require('path');
const VIDEO_FOLDER = path.resolve('./videos');
const GIFS_FOLDER = path.resolve('./gifs');

const count = parseInt(process.argv[2], 10) || 5;

screenshot
  .makeGifs('**/*.{mp4,avi,mov}', VIDEO_FOLDER, GIFS_FOLDER, count, 0.2, 0.8)
  .then(files => {
    console.log(`Done making ${files.length} GIFs!`);
  })
  .catch(err => {
    console.log('Could not make GIFs!', err);
  });
