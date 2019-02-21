#! /usr/bin/env node
require('dotenv').config();

const path = require('path');
const glob = require('glob');
const { trainFaces, saveDescriptors } = require('../lib/face-detection');

const BASE_FOLDER = path.resolve('./faces');

const argv = require('yargs')
  .usage('Usage: $0 <command> [options]')
  .describe(
    'name',
    'The name of the subfolder inside ./faces where the training images are'
  )
  .require('name').argv;

const processFaces = async name => {
  const outputFile = `${BASE_FOLDER}/${name}.json`;

  const files = glob.sync(`${BASE_FOLDER}/${name}/*.{jpg,png}`);

  console.log(`💪 Training model ${name}...`);

  const descriptors = await trainFaces(files);

  console.log(`💾 Saving ${path.basename(outputFile)}...`);

  saveDescriptors(outputFile, descriptors);
};

processFaces(argv.name);
