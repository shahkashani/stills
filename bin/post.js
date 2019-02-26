#! /usr/bin/env node
require('dotenv').config();

const dropbox = require('../lib/dropbox');
const twitter = require('../lib/twitter');
const tumblr = require('../lib/tumblr');
const path = require('path');

const argv = require('yargs')
  .usage('Usage: $0 <command> [options]')
  .describe('tag', 'Tag to add to the post (can be multiple)').argv;

const { tag } = argv;

console.log(`📦 Serving up artisanal stills...`);

dropbox
  .getRandomImage()
  .then(async image => {
    const binary = new Buffer(image.data, 'binary');
    const basename = path.basename(image.name);
    const matches = basename.match(/(.*) @ (.*)$/);
    const episodeName = matches[1];
    const postData = {};
    const tags = Array.isArray(tag) ? tag : [tag];

    if (twitter.canConnect()) {
      try {
        const tweet = await twitter.post(binary);
        const tweetURL = `https://twitter.com/${
          tweet.user.screen_name
        }/status/${tweet.id_str}`;
        postData.twitter = tweetURL;
        console.log(`👏 That tweet went OK! ${tweetURL}`);
      } catch (err) {
        console.log('😓 That tweet did NOT go OK:', error);
      }
    }

    if (tumblr.canConnect()) {
      try {
        const tumblrURL = await tumblr.post(binary, [episodeName, ...tags]);
        console.log('👏 That still made it to Tumblr just fine', tumblrURL);
        postData.tumblr = tumblrURL;
      } catch (err) {
        console.log('😓 Did not post to Tumblr:', err);
      }
    }

    if (postData) {
      dropbox.markAsPosted(image, postData).then(() => {
        console.log(`🏁 Cool, "${image.name}" marked as posted!`);
      });
    }
  })
  .catch(error => {
    console.log('😓 Could get random image from Dropbox:', error);
  });
