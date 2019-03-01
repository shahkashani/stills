const tumblr = require('tumblr.js');
const { readFileSync } = require('fs');

class DestinationTumblr {
  constructor({
    consumerKey,
    consumerSecret,
    token,
    tokenSecret,
    blogName,
    tags
  }) {
    this.client = tumblr.createClient({
      token,
      consumer_key: consumerKey,
      consumer_secret: consumerSecret,
      token_secret: tokenSecret,
      returnPromises: true
    });
    this.blogName = blogName;
    this.tags = tags;
  }

  get name() {
    return 'Tumblr';
  }

  async publish(image, { tags = [] } = {}) {
    const postTags = [...tags, ...this.tags].map(tag => tag.replace(/,/g, ' '));
    const data64 = readFileSync(image, 'base64');
    const response = await this.client.createPhotoPost(this.blogName, {
      data64,
      tags: postTags.join(',')
    });

    return `https://${this.blogName}.tumblr.com/${response.id}`;
  }
}

module.exports = DestinationTumblr;
