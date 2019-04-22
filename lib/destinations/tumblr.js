const tumblr = require('tumblr.js');
const { readFileSync } = require('fs');
const { get } = require('lodash');
const { compressToSize } = require('./utils');

const MAX_GIF_BYTES = 3000000;

class DestinationTumblr {
  constructor({
    consumerKey,
    consumerSecret,
    token,
    tokenSecret,
    blogName,
    tags = [],
    reblog = {
      postId: null,
      blogName: null
    }
  }) {
    this.client = tumblr.createClient({
      token,
      consumer_key: consumerKey,
      consumer_secret: consumerSecret,
      token_secret: tokenSecret,
      returnPromises: true
    });
    this.blogName = blogName;
    this.reblog = reblog;
    this.tags = tags;
  }

  get name() {
    return 'tumblr';
  }

  async createPhotoPost(image, tags, text) {
    const buffer = await compressToSize(readFileSync(image), MAX_GIF_BYTES);
    const post = {
      data64: buffer.toString('base64'),
      tags: tags.join(',')
    };
    if (text) {
      post.caption = text;
    }
    const response = await this.client.createPhotoPost(this.blogName, post);
    return response;
  }

  async reblogPost(reblogPostId, reblogName, tags, text) {
    const postInfo = await this.client.blogPosts(reblogName, {
      id: reblogPostId
    });
    const reblogKey = get(postInfo, 'posts[0].reblog_key');

    const response = await this.client.reblogPost(this.blogName, {
      id: reblogPostId,
      tags: tags.join(','),
      reblog_key: reblogKey,
      comment: text
    });
    return response;
  }

  async publish(image, { text = null, tags = [] } = {}) {
    const postTags = [...tags, ...this.tags].map(tag => tag.replace(/,/g, ''));
    const { postId: reblogPostId, blogName: reblogName } = this.reblog;

    const response =
      reblogPostId && reblogName
        ? await this.reblogPost(reblogPostId, reblogName, postTags, text)
        : await this.createPhotoPost(image, postTags, text);

    const url = `https://${this.blogName}.tumblr.com/post/${response.id}`;
    return {
      url,
      text,
      blogName: this.blogName,
      tags: postTags,
      postId: response.id
    };
  }
}

module.exports = DestinationTumblr;
