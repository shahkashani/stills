#! /usr/bin/env node
require('dotenv').config();

const path = require('path');
const glob = require('glob');
const dropbox = require('../lib/dropbox');
const fs = require('fs');

const STILLS_FOLDER = path.resolve('./stills');
const GIFS_FOLDER = path.resolve('./gifs');

const files = [
  ...glob.sync(`${STILLS_FOLDER}/*.png`),
  ...glob.sync(`${GIFS_FOLDER}/*.gif`)
];

const uploadSeries = files => {
  if (files.length === 0) {
    console.log('Donezo!');
    return;
  }
  const file = files.shift();
  console.log(`🚀 Uploading ${path.basename(file)}...`);
  dropbox
    .uploadPhoto(file)
    .then(() => {
      fs.unlinkSync(file);
      uploadSeries(files);
    })
    .catch(err => {
      console.log('💥 I am error:', err.error);
    });
};

uploadSeries(files);
