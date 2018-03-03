#! /usr/bin/env node
require('dotenv').config();

const dropbox = require('../lib/dropbox');
const twitter = require('../lib/twitter');
const tumblr = require('../lib/tumblr');
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

if (twitter.canConnect()) {
  twitter
    .getPosts()
    .then(posts => {
      const post = _.pick(_.first(posts), 'created_at', 'id_str', 'text');
      console.log('Twitter connection succeeeded');
      console.log(JSON.stringify(post, null, 2));
    })
    .catch(err => {
      console.log('Twitter connection failed', err);
    });
}

if (tumblr.canConnect()) {
  tumblr
    .getPosts()
    .then(posts => {
      const post = _.pick(_.first(posts), 'date', 'id', 'post_url', 'tags');
      console.log('Tumblr connection succeeeded');
      console.log(JSON.stringify(post, null, 2));
    })
    .catch(err => {
      console.log('Tumblr connection failed', err);
    });
}