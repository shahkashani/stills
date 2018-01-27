const Twitter = require('twitter');

var client = new Twitter({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
});

const getTweets = () => {
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

const tweet = data => {
  return new Promise((resolve, reject) => {
    // Make post request on media endpoint. Pass file data as media parameter
    client.post(
      'media/upload',
      { media: data },
      (uploadError, media, uploadResponse) => {
        if (uploadError) {
          reject(uploadError);
          return;
        }

        const status = {
          media_ids: media.media_id_string
        };

        client.post(
          'statuses/update',
          status,
          (tweetError, tweet, tweetResponse) => {
            if (tweetError) {
              reject(tweetError);
              return;
            }

            resolve(tweet);
          }
        );
      }
    );
  });
};

module.exports = { tweet, getTweets };
