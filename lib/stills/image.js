const Frames = require('./frames');
const { unlinkSync } = require('fs');

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
  }

  delete() {
    unlinkSync(this.filename);
    this.frames.delete();
  }

  reset() {
    this.frames.reset();
  }

  getInfo() {
    return this.frames.getInfo();
  }

  getFrames() {
    return this.frames.frames;
  }
}

module.exports = Image;
