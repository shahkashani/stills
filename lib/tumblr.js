const tumblr = require('tumblr.js');

const {
  TUMBLR_CONSUMER_KEY,
  TUMBLR_CONSUMER_SECRET,
  TUMBLR_ACCESS_TOKEN_KEY,
  TUMBLR_ACCESS_TOKEN_SECRET,
  TUMBLR_BLOG_NAME
} = process.env;

var getClient = () =>
  tumblr.createClient({
    consumer_key: TUMBLR_CONSUMER_KEY,
    consumer_secret: TUMBLR_CONSUMER_SECRET,
    token: TUMBLR_ACCESS_TOKEN_KEY,
    token_secret: TUMBLR_ACCESS_TOKEN_SECRET
  });

const canConnect = () =>
  TUMBLR_CONSUMER_KEY &&
  TUMBLR_CONSUMER_SECRET &&
  TUMBLR_ACCESS_TOKEN_KEY &&
  TUMBLR_ACCESS_TOKEN_SECRET &&
  TUMBLR_BLOG_NAME;

const getPosts = () => {
  const client = getClient();

  return new Promise((resolve, reject) => {
    client.blogPosts(TUMBLR_BLOG_NAME, (error, response) => {
      if (error) {
        reject(error);
      } else {
        resolve(response.posts);
      }
    });
  });
};

const post = (data, tags = []) => {
  const client = getClient();
  const cleanTags = tags.map(tag => tag.replace(/,/g, ' '));

  return new Promise((resolve, reject) => {
    client.createPhotoPost(
      TUMBLR_BLOG_NAME,
      { data64: data.toString('base64'), tags: cleanTags.join(',') },
      (error, response) => {
        if (error) {
          reject(error);
        } else {
          resolve(`https://${TUMBLR_BLOG_NAME}.tumblr.com/${response.id}`);
        }
      }
    );
  });
};

module.exports = { canConnect, post, getPosts };
