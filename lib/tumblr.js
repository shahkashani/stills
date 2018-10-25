const tumblr = require('tumblr.js');
const jimp = require('jimp');

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

const post = (data, name) => {
  const client = getClient();
  const tags = name.replace(/,/g, ' ');

  return new Promise((resolve, reject) => {
    jimp.read(data, function(err, image) {
      if (err) {
        reject(err);
      }

      image.crop(0, 0, image.bitmap.width - 1, image.bitmap.height);

      image.getBuffer(image.getMIME(), (err, buffer) => {
        if (err) {
          reject(err);
        }

        client.createPhotoPost(
          TUMBLR_BLOG_NAME,
          { data64: buffer.toString('base64'), tags: tags },
          (error, response) => {
            if (error) {
              reject(error);
            } else {
              resolve(response);
            }
          }
        );
      });
    });
  });
};

module.exports = { canConnect, post, getPosts };
