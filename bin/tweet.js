#! /usr/bin/env node
require('dotenv').config();

const dropbox = require('../lib/dropbox');
const twitter = require('../lib/twitter');
const tumblr = require('../lib/tumblr');
const fs = require('fs');
const path = require('path');

console.log(`Tweetin'...`);

dropbox
  .getRandomImage()
  .then(image => {
    const binary = new Buffer(image.data, 'binary');
    const basename = path.basename(image.name);
    const matches = basename.match(/(.*) @ (.*)$/);
    const episodeName = matches[1];

    if (twitter.canConnect()) {
      twitter
        .post(binary)
        .then(tweet => {
          const tweetURL = `https://twitter.com/${
            tweet.user.screen_name
            }/status/${tweet.id_str}`;

          console.log(`That tweet went OK! ${tweetURL}`);

          dropbox.markAsTweeted(image, tweetURL).then(() => {
            console.log(`Cool, "${image.name}" marked as tweeted`);
          });
        })
        .catch(error => {
          console.log('That tweet did NOT go OK:', error);
        });
    }

    if (tumblr.canConnect()) {
      tumblr.post(binary, episodeName)
        .then((post) => {
          console.log('Tumbl\'d', post);
        }).catch(error => {
          console.log('Did not post to Tumblr:', error);
        });
    }
  })
  .catch(error => {
    console.log('Could get random image from dropbox:', error);
  });
