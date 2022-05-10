const tumblr = require('tumblr.js');
const { createReadStream } = require('fs');
const { get, pick, compact } = require('lodash');
const textToGlyphs = require('../utils/text-to-glyphs');
const removeHighlights = require('../utils/remove-highlights');

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
    },
    publishState,
    highlightColor = '#FF492F',
    ask = null
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
    this.ask = ask;
    this.tags = tags;
    this.highlightColor = highlightColor;
    this.publishState = publishState;
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

  getAlt(index, captions, analysis, useGlyphs) {
    const a =
      analysis.length > 0 && index < analysis.length
        ? `${analysis[index].text}.`
        : null;
    const c =
      captions.length > 0 &&
      index < captions.length &&
      captions[index].join(' ').length > 0
        ? `Caption: ${captions[index]
            .map((c) => textToGlyphs(c, useGlyphs))
            .map((c) => removeHighlights(c))
            .join(' ')}`
        : null;
    if (!a && !c) {
      return undefined;
    }
    return compact([a, c]).join(' ');
  }

  highlightWords(text) {
    const TOKEN = '*';
    if (!text || text.length === 0 || text.indexOf('*') === -1) {
      return {
        text,
        formatting: []
      };
    }
    if (!this.highlightColor) {
      return {
        text: text.replace(/\*/g, ''),
        formatting: []
      };
    }
    const textArray = text.split('');
    const formatting = [];
    let finalText = '';
    let isInsideToken = false;
    let tokenStartIndex = -1;
    textArray.forEach((letter) => {
      if (letter === TOKEN) {
        if (isInsideToken) {
          isInsideToken = false;
          formatting.push({
            start: tokenStartIndex,
            end: finalText.length,
            type: 'color',
            hex: this.highlightColor
          });
        } else {
          tokenStartIndex = finalText.length;
          isInsideToken = true;
        }
      } else {
        finalText += letter;
      }
    });
    console.log('📒 Final text:', finalText);
    formatting.forEach((f) => {
      console.log(`✏️  Highlighting "${finalText.slice(f.start, f.end)}"`);
    });
    return {
      text: finalText,
      formatting
    };
  }

  async makeNpfRequestForm(apiPath, formData, body, method = 'post') {
    return new Promise((resolve, reject) => {
      this.client.request[method](
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

  async createPhotoPostNpf(
    images,
    tags,
    rawText,
    captions,
    analysis,
    useGlyphs
  ) {
    const formData = images.reduce((memo, image, index) => {
      memo[`pic${index}`] = createReadStream(image.filename);
      return memo;
    }, {});

    const imageContent = images.map((image, index) => {
      return {
        type: 'image',
        alt_text: this.getAlt(index, captions, analysis, useGlyphs),
        media: [
          {
            identifier: `pic${index}`
          }
        ]
      };
    });

    const { text, formatting } = this.highlightWords(rawText);
    const textContent = text ? { type: 'text', text } : null;
    if (textContent) {
      if (formatting.length > 0) {
        textContent.formatting = formatting;
      }
    }

    if (this.ask) {
      const content = [
        ...this.ask.content,
        ...imageContent,
        ...(textContent ? [textContent] : [])
      ];
      const layout = [this.ask.layout[0]];
      const sendData = {
        layout,
        content,
        tags: tags.join(','),
        state: this.publishState
      };
      console.log('🙋‍♂️ Submitting data');
      console.log(JSON.stringify(sendData, null, 2));
      const { response } = await this.makeNpfRequestForm(
        `/blog/${this.blogName}/posts/${this.ask.id}`,
        formData,
        sendData,
        'put'
      );
      return response;
    }

    const { response } = await this.makeNpfRequestForm(
      `/blog/${this.blogName}/posts`,
      formData,
      {
        tags: tags.join(','),
        state: this.publishState,
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

  async publish(images, { text = null, tags = [] } = {}, results, useGlyphs) {
    const captions = (results || {}).captions || [];
    const analysis = (results || {}).analysis || [];
    const postTags = [...tags, ...this.tags].map((tag) =>
      tag.replace(/,/g, '')
    );
    const { postId: reblogPostId, blogName: reblogName } = this.reblog;

    const response =
      reblogPostId && reblogName
        ? await this.reblogPost(reblogPostId, reblogName, postTags, text)
        : await this.createPhotoPostNpf(
            images,
            postTags,
            text,
            captions,
            analysis,
            useGlyphs
          );

    const url = `https://${this.blogName}.tumblr.com/post/${response.id}`;
    return {
      url,
      text,
      blogName: this.blogName,
      tags: postTags,
      postId: '' + response.id
    };
  }

  async passthrough(post) {
    const fields = pick(post, [
      'content',
      'tags',
      'summary',
      'layout',
      'source_url'
    ]);
    fields.tags = (fields.tags || []).join(',');
    const { response } = await this.makeNpfRequestForm(
      `/blog/${this.blogName}/posts`,
      {},
      {
        ...fields,
        state: this.publishState
      }
    );
    const url = `https://${this.blogName}.tumblr.com/post/${response.id}`;
    return {
      url,
      text: post.summary,
      blogName: this.blogName,
      tags: post.tags,
      postId: '' + response.id
    };
  }
}

module.exports = DestinationTumblr;
