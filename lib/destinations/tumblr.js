const tumblr = require('tumblr.js');
const { createReadStream } = require('fs');
const { get, pick, compact, flattenDeep } = require('lodash');
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
    /** @type {tumblr.Client} */
    this.client = tumblr.createClient({
      token,
      consumer_key: consumerKey,
      consumer_secret: consumerSecret,
      token_secret: tokenSecret
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

  getAlt(index, captions, analysis, useGlyphs) {
    const a =
      analysis.length > 0 && index < analysis.length
        ? `${analysis[index].text}.`
        : null;

    const useCaptions =
      captions.length > 0 && captions[index]
        ? flattenDeep([captions[index]])
        : [];

    const c =
      useCaptions.join('').length > 0
        ? `Caption: ${useCaptions
            .map((c) => textToGlyphs(c, useGlyphs))
            .map((c) => removeHighlights(c))
            .join('')}`
        : '';
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

  async createPhotoPostNpf(
    images,
    tags,
    rawText,
    captions,
    analysis,
    useGlyphs
  ) {
    const imageContent = images.map((image, index) => {
      return {
        type: 'image',
        alt_text: this.getAlt(index, captions, analysis, useGlyphs),
        media: createReadStream(image.filename)
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
        tags,
        state: this.publishState
      };
      console.log('🙋‍♂️ Submitting data');
      console.log(JSON.stringify(sendData, null, 2));
      const response = await this.client.editPost(
        this.blogName,
        this.ask.id,
        sendData
      );
      return response;
    }

    const response = await this.client.createPost(this.blogName, {
      tags,
      state: this.publishState,
      content: [...imageContent, ...(textContent ? [textContent] : [])]
    });
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
    const response = await this.client.createPost(this.blogName, {
      ...fields,
      state: this.publishState
    });
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
