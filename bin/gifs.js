#! /usr/bin/env node
require('dotenv').config();

const screenshot = require('../lib/screenshot');

const path = require('path');
const VIDEO_FOLDER = path.resolve('./videos');
const GIFS_FOLDER = path.resolve('./gifs');

const argv = require('yargs')
  .usage('Usage: $0 <command> [options]')
  .default('num', 5)
  .default('width', 560).argv;

const num = argv.num;
const width = argv.width;

console.log(`Making ${num} GIFs at ${width}px...`);

screenshot
  .makeGifs(
    '**/*.{mp4,avi,mov,mkv}',
    VIDEO_FOLDER,
    GIFS_FOLDER,
    num,
    0.2,
    0.8,
    width
  )
  .then(files => {
    console.log(`Done making ${files.length} GIFs!`);
  })
  .catch(err => {
    console.log('Could not make GIFs!', err);
  });
