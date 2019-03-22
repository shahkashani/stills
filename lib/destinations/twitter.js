const Twitter = require('twitter');
const { readFileSync } = require('fs');
const brevity = require('brevity');

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

  async publish(image, { text = null } = {}) {
    const statusText = text
      ? brevity.shorten(text, null, null, null, 280)
      : null;
    const media = await this.post(this.client, 'media/upload', {
      media: readFileSync(image)
    });
    const tweet = await this.post(this.client, 'statuses/update', {
      status: this.isIncludeText ? statusText : null,
      media_ids: media.media_id_string
    });
    const url = `https://twitter.com/${tweet.user.screen_name}/status/${
      tweet.id_str
    }`;

    if (this.quoteClient) {
      await this.post(this.quoteClient, 'statuses/update', {
        status: statusText,
        attachment_url: url
      });
    }

    return url;
  }
}

module.exports = DestinationTwitter;
