#! /usr/bin/env node
require('dotenv').config();

const dropbox = require('../lib/dropbox');
const twitter = require('../lib/twitter');
const tumblr = require('../lib/tumblr');
const path = require('path');

console.log(`Tweetin'...`);

dropbox
  .getRandomImage()
  .then(async image => {
    const binary = new Buffer(image.data, 'binary');
    const basename = path.basename(image.name);
    const matches = basename.match(/(.*) @ (.*)$/);
    const episodeName = matches[1];
    let tweetURL;

    if (twitter.canConnect()) {
      try {
        const tweet = await twitter.post(binary);
        tweetURL = `https://twitter.com/${tweet.user.screen_name}/status/${
          tweet.id_str
        }`;
        console.log(`That tweet went OK! ${tweetURL}`);
      } catch (err) {
        console.log('That tweet did NOT go OK:', error);
      }
    }

    if (tumblr.canConnect()) {
      try {
        const post = await tumblr.post(binary, episodeName);
        console.log("Tumbl'd", post);
      } catch (err) {
        console.log('Did not post to Tumblr:', error);
      }
    }

    if (tweetURL) {
      dropbox.markAsTweeted(image, tweetURL).then(() => {
        console.log(`Cool, "${image.name}" marked as tweeted`);
      });
    }
  })
  .catch(error => {
    console.log('Could get random image from dropbox:', error);
  });
