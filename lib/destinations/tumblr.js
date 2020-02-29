const tumblr = require('tumblr.js');
const { readFileSync, createReadStream } = require('fs');
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

  getBaseParams(apiPath) {
    return {
      ...this.client.requestOptions,
      url: this.client.baseUrl + apiPath,
      oauth: this.client.credentials
    };
  }

  getStartUserIndex(text, user) {
    if (!user || !text) {
      return -1;
    }
    const { name } = user;
    return text.toLowerCase().indexOf(name.toLowerCase());
  }

  async makeNpfRequestForm(apiPath, formData, body) {
    return new Promise((resolve, reject) => {
      this.client.request.post(
        {
          ...this.getBaseParams(apiPath),
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          formData: {
            json: JSON.stringify(body),
            ...formData
          }
        },
        (err, _response, body) => {
          if (err) {
            return reject(err);
          }
          try {
            body = JSON.parse(body);
          } catch (e) {
            return reject(`Malformed Response: ${body}`);
          }
          resolve(body);
        }
      );
    });
  }

  async createPhotoPostNpf(image, tags, text, user) {
    const formData = {
      pic: createReadStream(image)
    };
    const textContent = text ? { type: 'text', text } : null;
    if (textContent && user) {
      const { name } = user;
      const start = this.getStartUserIndex(text, user);
      if (start > -1) {
        const end = start + name.length;
        textContent.formatting = [
          {
            start,
            end,
            type: 'mention',
            blog: user
          }
        ];
      }
    }
    const { response } = await this.makeNpfRequestForm(
      `/blog/${this.blogName}/posts`,
      formData,
      {
        tags: tags.join(','),
        content: [
          {
            type: 'image',
            media: [
              {
                identifier: 'pic'
              }
            ]
          },
          ...(textContent ? [textContent] : [])
        ]
      }
    );
    return response;
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

  async publish(image, { text = null, tags = [] } = {}, globals) {
    const user = globals && globals.user ? globals.user : null;
    const postTags = [...tags, ...this.tags].map(tag => tag.replace(/,/g, ''));
    const { postId: reblogPostId, blogName: reblogName } = this.reblog;

    const response =
      reblogPostId && reblogName
        ? await this.reblogPost(reblogPostId, reblogName, postTags, text)
        : await this.createPhotoPostNpf(image, postTags, text, user)

    const url = `https://${this.blogName}.tumblr.com/post/${response.id}`;
    return {
      url,
      text,
      blogName: this.blogName,
      tags: postTags,
      postId: '' + response.id
    };
  }
}

module.exports = DestinationTumblr;
