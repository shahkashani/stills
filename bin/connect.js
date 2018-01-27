#! /usr/bin/env node
require('dotenv').config();

const dropbox = require('../lib/dropbox');
const twitter = require('../lib/twitter');
const _ = require('lodash');

dropbox
  .getAllFiles()
  .then(files => {
    console.log(
      `Dropbox connection succeeeded, ${files.length} screenshots left!`
    );
  })
  .catch(err => {
    console.log('Dropbox connection failed', err);
  });

twitter
  .getTweets()
  .then(tweets => {
    const tweet = _.pick(_.first(tweets), 'created_at', 'id_str', 'text');
    console.log('Twitter connection succeeeded');
    console.log(JSON.stringify(tweet, null, 2));
  })
  .catch(err => {
    console.log('Twitter connection failed', err);
  });
