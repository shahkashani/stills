const Twitter = require('twitter');

const {
  TWITTER_CONSUMER_KEY,
  TWITTER_CONSUMER_SECRET,
  TWITTER_ACCESS_TOKEN_KEY,
  TWITTER_ACCESS_TOKEN_SECRET
} = process.env;

const getClient = () =>
  new Twitter({
    consumer_key: TWITTER_CONSUMER_KEY,
    consumer_secret: TWITTER_CONSUMER_SECRET,
    access_token_key: TWITTER_ACCESS_TOKEN_KEY,
    access_token_secret: TWITTER_ACCESS_TOKEN_SECRET
  });

const canConnect = () =>
  TWITTER_CONSUMER_KEY &&
  TWITTER_CONSUMER_SECRET &&
  TWITTER_ACCESS_TOKEN_KEY &&
  TWITTER_ACCESS_TOKEN_SECRET;

const getPosts = () => {
  const client = getClient();

  return new Promise((resolve, reject) => {
    client.get('statuses/user_timeline', {}, function(error, tweets, response) {
      if (error) {
        reject(error);
      } else {
        resolve(tweets);
      }
    });
  });
};

const post = data => {
  const client = getClient();

  return new Promise((resolve, reject) => {
    // Make post request on media endpoint. Pass file data as media parameter
    client.post('media/upload', { media: data }, (uploadError, media) => {
      if (uploadError) {
        reject(uploadError);
        return;
      }

      const status = {
        media_ids: media.media_id_string
      };

      client.post('statuses/update', status, (tweetError, tweet) => {
        if (tweetError) {
          reject(tweetError);
          return;
        }

        resolve(tweet);
      });
    });
  });
};

module.exports = { canConnect, post, getPosts };
