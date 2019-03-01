const Twitter = require('twitter');
const { readFileSync } = require('fs');

class DestinationTwitter {
  constructor({
    consumerKey,
    consumerSecret,
    accessTokenKey,
    accessTokenSecret
  }) {
    this.client = new Twitter({
      consumer_key: consumerKey,
      consumer_secret: consumerSecret,
      access_token_key: accessTokenKey,
      access_token_secret: accessTokenSecret
    });
  }

  get name() {
    return 'Twitter';
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

  async publish(image) {
    const media = await this.post('media/upload', {
      media: readFileSync(image)
    });
    const status = {
      media_ids: media.media_id_string
    };
    const tweet = await this.post('statuses/update', status);
    return `https://twitter.com/${tweet.user.screen_name}/status/${
      tweet.id_str
    }`;
  }
}

module.exports = DestinationTwitter;
