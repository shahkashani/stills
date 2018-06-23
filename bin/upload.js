#! /usr/bin/env node
require('dotenv').config();

const path = require('path');
const glob = require('glob');
const dropbox = require('../lib/dropbox');
const fs = require('fs');
const path = require('path');

const STILLS_FOLDER = path.resolve('./stills');

const files = glob.sync(`${STILLS_FOLDER}/*.png`);

const uploadSeries = files => {
  if (files.length === 0) {
    console.log('Donezo!');
    return;
  }
  const file = files.shift();
  console.log(`Uploading ${path.basename(file)}...`);
  dropbox.uploadPhoto(file).then(() => {
    fs.unlinkSync(file);
    uploadSeries(files);
  });
};

uploadSeries(files);
