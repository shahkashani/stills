#! /usr/bin/env node
require('dotenv').config();

const dropbox = require('../lib/dropbox');
const twitter = require('../lib/twitter');
const fs = require('fs');
const path = require('path');

console.log(`Tweetin'...`);

dropbox
  .getRandomImage()
  .then(image => {
    twitter
      .tweet(new Buffer(image.data, 'binary'))
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
  })
  .catch(error => {
    console.log('Could get random image from dropbox:', error);
  });
