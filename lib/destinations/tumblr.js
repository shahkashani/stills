const tumblr = require('tumblr.js');
const { readFileSync } = require('fs');
const { get } = require('lodash');

class DestinationTumblr {
  constructor({
    consumerKey,
    consumerSecret,
    token,
    tokenSecret,
    blogName,
    tags,
    reblogTo,
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
    this.reblogTo = reblogTo;
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
    const id = response.id;

    if (this.reblogTo && text) {
      const { blogName: reblogToBlogName } = this.reblogTo;
      const postInfo = await this.client.blogPosts(this.blogName, { id });
      const reblogKey = get(postInfo, 'posts[0].reblog_key');
      if (reblogKey) {
        await this.client.reblogPost(reblogToBlogName, {
          id,
          reblog_key: reblogKey,
          comment: text
        });
      }
    }

    return `https://${this.blogName}.tumblr.com/${id}`;
  }
}

module.exports = DestinationTumblr;
