const Twitter = require('twitter');
const { readFileSync } = require('fs');

class DestinationTwitter {
  constructor({
    consumerKey,
    consumerSecret,
    accessTokenKey,
    accessTokenSecret,
    inReplyTo = { username: null, id: null }
  }) {
    this.client = new Twitter({
      consumer_key: consumerKey,
      consumer_secret: consumerSecret,
      access_token_key: accessTokenKey,
      access_token_secret: accessTokenSecret
    });
    this.inReplyTo = inReplyTo;
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

  async tweetImage(media, status) {
    const mediaTweet = await this.post('media/upload', {
      media
    });
    const { username, id } = this.inReplyTo;
    if (username) {
      status = `@${username} ${status}`;
    }
    const tweet = await this.post('statuses/update', {
      status,
      media_ids: mediaTweet.media_id_string,
      in_reply_to_status_id: id
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
    const response = await this.tweetImage(
      readFileSync(image),
      this.shorten(text)
    );
    const url = `https://twitter.com/${response.user.screen_name}/status/${
      response.id_str
    }`;
    return { ...response, text, url };
  }
}

module.exports = DestinationTwitter;
