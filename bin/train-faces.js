#! /usr/bin/env node
require('dotenv').config();

const path = require('path');
const glob = require('glob');
const { trainFaces, saveDescriptors } = require('../lib/validators/face-utils');
const { kebabCase } = require('lodash');

const argv = require('yargs')
  .usage('Usage: $0 <command> [options]')
  .alias('output', 'o')
  .alias('input', 'i')
  .describe('name', 'The name of the person')
  .describe('output', 'The folder to save the descriptor JSON file in')
  .describe('input', 'The folder to read image files (jpg, png) from')
  .require('name')
  .require('input')
  .require('output').argv;

const { name, input, output } = argv;

const processFaces = async () => {
  const outputFile = `${output}/${kebabCase(name)}.json`;

  const files = glob.sync(`${input}/*.{jpg,png}`);

  console.log(`💪 Training model ${name} based on ${files.length} images`);

  const descriptors = await trainFaces(files);

  console.log(`💾 Saving ${outputFile}`);

  saveDescriptors(name, outputFile, descriptors);
};

processFaces();
