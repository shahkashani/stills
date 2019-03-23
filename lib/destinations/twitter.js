const Twitter = require('twitter');
const { readFileSync } = require('fs');
const text2png = require('text2png');
const wrap = require('wordwrap')(60);

class DestinationTwitter {
  constructor({
    consumerKey,
    consumerSecret,
    accessTokenKey,
    accessTokenSecret,
    quoteTo,
    isIncludeText = true
  }) {
    this.client = new Twitter({
      consumer_key: consumerKey,
      consumer_secret: consumerSecret,
      access_token_key: accessTokenKey,
      access_token_secret: accessTokenSecret
    });
    if (quoteTo) {
      this.quoteTo = quoteTo;
      this.quoteClient = new Twitter({
        consumer_key: quoteTo.consumerKey,
        consumer_secret: quoteTo.consumerSecret,
        access_token_key: quoteTo.accessTokenKey,
        access_token_secret: quoteTo.accessTokenSecret
      });
    }
    this.isIncludeText = !!isIncludeText;
  }

  get name() {
    return 'Twitter';
  }

  post(client, endpoint, params) {
    return new Promise((resolve, reject) => {
      client.post(endpoint, params, (error, data) => {
        if (error) {
          reject(error);
        } else {
          resolve(data);
        }
      });
    });
  }

  async tweetImage(client, media, status, replyTo = {}) {
    const mediaTweet = await this.post(client, 'media/upload', {
      media
    });
    if (replyTo.username) {
      status = `@${replyTo.username} ${status}`;
    }
    const tweet = await this.post(client, 'statuses/update', {
      status,
      media_ids: mediaTweet.media_id_string,
      in_reply_to_status_id: replyTo.id
    });
    return tweet;
  }

  shorten(text, length = 140) {
    if (!text) {
      return '';
    }
    const clean = text.replace(/\n/g, ' ').replace(/\s{2,}/, ' ');
    const sentences = clean.replace(/([.?!])\s*(?=[A-Z])/g, '$1|').split('|');
    let result = '';
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      if (result.length + sentence.length > length) {
        return result;
      }
      result = `${result} ${sentence}`;
    }
    return result;
  }

  async publish(image, { text = null } = {}) {
    const statusText = this.shorten(text);

    const tweet = await this.tweetImage(
      this.client,
      readFileSync(image),
      this.isIncludeText ? statusText : ''
    );

    const url = `https://twitter.com/${tweet.user.screen_name}/status/${
      tweet.id_str
    }`;

    if (this.quoteTo && this.quoteClient && text) {
      const quoteImage = text2png(wrap(text), this.quoteTo.style);
      await this.tweetImage(
        this.quoteClient,
        quoteImage,
        this.quoteTo.isIncludeText ? statusText : null,
        { id: tweet.id_str, username: tweet.user.screen_name }
      );
    }

    return url;
  }
}

module.exports = DestinationTwitter;
