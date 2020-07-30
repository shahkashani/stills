const tumblr = require('tumblr.js');
const { sample } = require('lodash');

class GlobalsUser {
  constructor({
    consumerKey = null,
    consumerSecret = null,
    tokenKey = null,
    tokenSecret = null,
    blogName = null,
    numPosts = 50,
    userName = null,
    mentionsSymbol = ''
  }) {
    this.blogName = blogName;
    this.numPosts = numPosts;
    this.userName = userName;
    this.mentionsSymbol = mentionsSymbol;
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

  async getUser(userName) {
    const data = await this.client.blogInfo(`${userName}.tumblr.com`);
    const blog = {
      name: `${this.mentionsSymbol}${data.blog.name}`,
      uuid: data.blog.uuid,
      url: data.blog.url
    };
    return [blog];
  }

  async getNoteUsers() {
    const data = await this.client.blogPosts(this.blogName, {
      notes_info: true,
      npf: true,
      limit: this.numPosts
    });
    const posts = data.posts || [];

    const mentions = posts.reduce((memo, { content }) => {
      content.forEach((block) => {
        if (block.type === 'text') {
          (block.formatting || []).forEach((format) => {
            if (format.type === 'mention' && format.blog) {
              memo[format.blog.name] = true;
            }
          });
        }
      });
      return memo;
    }, {});

    return posts.reduce((memo, post) => {
      const blogs = (post.notes || []).filter((note) => {
        return note.type === 'reblog' && !mentions[note.blog_name];
      });
      memo.push.apply(
        memo,
        blogs.map((blog) => ({
          name: `${this.mentionsSymbol}${blog.blog_name}`,
          uuid: blog.blog_uuid,
          url: blog.blog_url
        }))
      );
      return memo;
    }, []);
  }

  async get() {
    const users = this.userName
      ? await this.getUser(this.userName)
      : await this.getNoteUsers();
    return sample(users);
  }
}

module.exports = GlobalsUser;
