const Frames = require('./frames');

class Image {
  constructor({ filename }) {
    this.filename = filename;
    this.frames = new Frames({ filename });
  }

  async prepare() {
    await this.frames.expand();
  }

  async collapse() {
    await this.frames.collapse();
    this.frames.delete();
  }

  getInfo() {
    return this.frames.getInfo();
  }

  getFrames() {
    return this.frames.frames;
  }
}

module.exports = Image;
