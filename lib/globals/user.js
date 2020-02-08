const tumblr = require('tumblr.js');
const { sample } = require('lodash');

class GlobalsUser {
  constructor({
    consumerKey = null,
    consumerSecret = null,
    tokenKey = null,
    tokenSecret = null,
    blogName = null,
    numPosts = 50
  }) {
    this.blogName = blogName;
    this.numPosts = numPosts;
    this.client = tumblr.createClient({
      token: tokenKey,
      token_secret: tokenSecret,
      consumer_key: consumerKey,
      consumer_secret: consumerSecret,
      returnPromises: true
    });
  }

  get name() {
    return 'user';
  }

  async getNoteUsers() {
    const data = await this.client.blogPosts(this.blogName, {
      notes_info: true,
      limit: this.numPosts
    });
    return (data.posts || []).reduce((memo, post) => {
      const blogs = (post.notes || []).filter(note => note.type === 'reblog');
      memo.push.apply(
        memo,
        blogs.map(blog => ({
          name: blog.blog_name,
          uuid: blog.blog_uuid,
          url: blog.blog_url
        }))
      );
      return memo;
    }, []);
  }

  async get() {
    const users = await this.getNoteUsers();
    return sample(users);
  }
}

module.exports = GlobalsUser;
