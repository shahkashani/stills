const tumblr = require('tumblr.js');
const { createReadStream } = require('fs');
const { get, min } = require('lodash');

const WORD_HEX = '#FF492F';

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

  getStartUserIndexes(text, user) {
    const result = [];
    if (!user || !text) {
      return result;
    }
    const { name } = user;
    const regexp = new RegExp(name, 'gi');
    let m;
    while ((m = regexp.exec(text))) {
      result.push(m.index);
    }
    return result;
  }

  getStartWordIndex(text, word) {
    if (!word || !text) {
      return result;
    }
    const regexp = new RegExp(`\\b${word}\\b`);
    const m = regexp.exec(text);
    return m ? m.index : null;
  }

  getMatchRegexps(words) {
    return words.map((word) => new RegExp(`\\b${word}\\b`, 'i'));
  }

  highlightWords(text, words) {
    const regexps = this.getMatchRegexps(words);
    return regexps.map((regexp, i) => {
      const m = regexp.exec(text);
      return {
        start: m.index,
        end: m.index + words[i].length,
        type: 'color',
        hex: WORD_HEX
      };
    });
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

  async createPhotoPostNpf(images, tags, text, user, word) {
    const formData = images.reduce((memo, image, index) => {
      memo[`pic${index}`] = createReadStream(image);
      return memo;
    }, {});

    const imageContent = images.map((image, index) => {
      return {
        type: 'image',
        media: [
          {
            identifier: `pic${index}`
          }
        ]
      };
    });

    const textContent = text ? { type: 'text', text } : null;
    if (textContent) {
      const finalFormatting = [];
      if (user) {
        const { name } = user;
        const indexes = this.getStartUserIndexes(text, user);
        if (indexes.length > 0) {
          const length = name.length;
          const formatting = indexes.map((start) => {
            const end = start + length;
            return {
              start,
              end,
              type: 'mention',
              blog: user
            };
          });
          finalFormatting.push.apply(finalFormatting, formatting);
        }
      }
      if (word) {
        finalFormatting.push.apply(
          finalFormatting,
          this.highlightWords(text, word)
        );
      }
      if (finalFormatting.length > 0) {
        textContent.formatting = finalFormatting;
      }
    }

    const { response } = await this.makeNpfRequestForm(
      `/blog/${this.blogName}/posts`,
      formData,
      {
        tags: tags.join(','),
        content: [...imageContent, ...(textContent ? [textContent] : [])]
      }
    );
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

  async publish(images, { text = null, tags = [] } = {}, globals) {
    const user = globals && globals.user ? globals.user : null;
    const word = globals && globals.word ? globals.word : null;
    const postTags = [...tags, ...this.tags].map((tag) =>
      tag.replace(/,/g, '')
    );
    const { postId: reblogPostId, blogName: reblogName } = this.reblog;

    const response =
      reblogPostId && reblogName
        ? await this.reblogPost(reblogPostId, reblogName, postTags, text)
        : await this.createPhotoPostNpf(images, postTags, text, user, word);

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
