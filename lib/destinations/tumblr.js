const tumblr = require('tumblr.js');
const { createReadStream } = require('fs');
const { get, pick, compact, flattenDeep } = require('lodash');
const textToGlyphs = require('../utils/text-to-glyphs');
const removeHighlights = require('../utils/remove-highlights');
const highlightWords = require('../utils/highlight-words');

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

    const { text, formatting } = highlightWords(
      rawText,
      true,
      this.highlightColor
    );
    const textContent = text ? { type: 'text', text } : null;
    if (textContent) {
      if (formatting.length > 0) {
        textContent.formatting = formatting;
      }
    }

    if (this.ask) {
      const askLayout = this.ask.layout[0];
      const askContent = this.ask.content.filter(
        (_c, i) => askLayout.blocks.indexOf(i) !== -1
      );
      const content = [
        ...askContent,
        ...imageContent,
        ...(textContent ? [textContent] : [])
      ];
      const layout = [askLayout];
      const sendData = {
        layout,
        content,
        tags,
        state: this.publishState
      };
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
