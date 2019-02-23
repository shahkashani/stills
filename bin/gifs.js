#! /usr/bin/env node
require('dotenv').config();

const path = require('path');
const screenshot = require('../lib/screenshot');

const runPlugins = require('../lib/plugins/run-plugins');
const CaptionsPlugin = require('../lib/plugins/captions');
const DeleteDupesPlugin = require('../lib/plugins/delete-dupes');

const argv = require('yargs')
  .usage('Usage: $0 <command> [options]')
  .default('glob', '**/*.{mp4,avi,mov,mkv}')
  .default('num', 5)
  .default('width', 560)
  .describe('captions', '0-100, what percentage of images should be captioned')
  .describe('glob', 'Glob describing what videos to process').argv;

const VIDEO_FOLDER = path.resolve('./videos');
const GIFS_FOLDER = path.resolve('./gifs');
const CAPTIONS_FOLDER = path.resolve('./captions');

const { num, width, captions, glob } = argv;

const plugins = [new DeleteDupesPlugin()];

if (captions) {
  plugins.push(
    new CaptionsPlugin({
      captionsFolder: CAPTIONS_FOLDER,
      minCaptions: captions / 100,
      numCaptions: 2,
      fontSize: 25
    })
  );
}

screenshot
  .makeGifs(glob, VIDEO_FOLDER, GIFS_FOLDER, num, 0.2, 0.8, width)
  .then(async files => {
    await runPlugins(files, plugins);
  })
  .catch(err => {
    console.log('Could not make GIFs!', err);
  });
