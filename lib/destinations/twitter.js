const Twitter = require('twitter');
const { readFileSync } = require('fs');

class DestinationTwitter {
  constructor({
    consumerKey,
    consumerSecret,
    accessTokenKey,
    accessTokenSecret,
    skipText = false,
    inReplyTo = { username: null, id: null }
  }) {
    this.client = new Twitter({
      consumer_key: consumerKey,
      consumer_secret: consumerSecret,
      access_token_key: accessTokenKey,
      access_token_secret: accessTokenSecret
    });
    this.inReplyTo = inReplyTo;
    this.skipText = skipText;
  }

  get name() {
    return 'twitter';
  }

  post(endpoint, params) {
    return new Promise((resolve, reject) => {
      this.client.post(endpoint, params, (error, data) => {
        if (error) {
          reject(error);
        } else {
          resolve(data);
        }
      });
    });
  }

  async tweetImage(files, status) {
    const ids = [];
    for (const file of files) {
      const media = readFileSync(file);
      const mediaTweet = await this.post('media/upload', {
        media
      });
      ids.push(mediaTweet.media_id_string);
    }
    const { username, id } = this.inReplyTo;
    if (username) {
      status = `@${username} ${status}`;
    }
    const tweet = await this.post('statuses/update', {
      status,
      media_ids: ids.join(','),
      in_reply_to_status_id: id
    });
    return tweet;
  }

  shorten(text, length = 140) {
    if (!text || this.skipText) {
      return '';
    }
    const clean = text
      .replace(/\n/g, ' ')
      .replace(/\s{2,}/, ' ')
      .replace(/\*/g, '');
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

  async publish(images, { text = null } = {}) {
    const response = await this.tweetImage(images, this.shorten(text));
    const url = `https://twitter.com/${response.user.screen_name}/status/${response.id_str}`;
    return { ...response, text, url };
  }
}

module.exports = DestinationTwitter;
