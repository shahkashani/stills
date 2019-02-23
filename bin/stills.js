#! /usr/bin/env node
require('dotenv').config();

const path = require('path');
const screenshot = require('../lib/screenshot');

const runPlugins = require('../lib/plugins/run-plugins');
const CaptionsPlugin = require('../lib/plugins/captions');
const DeleteDupesPlugin = require('../lib/plugins/delete-dupes');
const FaceDetectionPlugin = require('../lib/plugins/face-detection');

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

const plugins = [new DeleteDupesPlugin()];

if (faces) {
  plugins.push(
    new FaceDetectionPlugin({
      descriptorsFolder: FACES_FOLDER,
      minMatches: faces / 100
    })
  );
}

if (captions) {
  plugins.push(
    new CaptionsPlugin({
      captionsFolder: CAPTIONS_FOLDER,
      minCaptions: captions / 100
    })
  );
}

screenshot
  .makeStills(glob, VIDEO_FOLDER, STILLS_FOLDER, num, 0.2, 0.8)
  .then(async files => {
    await runPlugins(files, plugins);
  })
  .catch(err => {
    console.log('😡 Could not make stills!', err);
  });
