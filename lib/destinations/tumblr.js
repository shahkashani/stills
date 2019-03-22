const tumblr = require('tumblr.js');
const { readFileSync } = require('fs');

class DestinationTumblr {
  constructor({
    consumerKey,
    consumerSecret,
    token,
    tokenSecret,
    blogName,
    tags,
    isIncludeText = true
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
    this.isIncludeText = !!isIncludeText;
  }

  get name() {
    return 'Tumblr';
  }

  async publish(image, { tags = [], text = null } = {}) {
    const postTags = [...tags, ...this.tags].map(tag => tag.replace(/,/g, ' '));
    const data64 = readFileSync(image, 'base64');
    const post = {
      data64,
      tags: postTags.join(',')
    };
    if (text && this.isIncludeText) {
      post.caption = text;
    }
    const response = await this.client.createPhotoPost(this.blogName, post);

    return `https://${this.blogName}.tumblr.com/${response.id}`;
  }
}

module.exports = DestinationTumblr;
