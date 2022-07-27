const Frames = require('./frames');
const { unlinkSync, copyFileSync } = require('fs');

class Image {
  constructor({ filename, minFaceConfidence }) {
    this.filename = filename;
    this.frames = new Frames({ filename, minFaceConfidence });
  }

  async getScenes() {
    return await this.frames.getScenes();
  }

  async prepare() {
    await this.frames.expand();
  }

  async collapse() {
    await this.frames.collapse();
  }

  async replace(url) {
    copyFileSync(url, this.filename);
    this.frames.delete();
    await this.frames.expand(true);
  }

  async replaceFrame(frame, url) {
    await this.frames.frames[frame].replace(url);
    await this.collapse();
  }

  delete(deleteFramesOnly = false) {
    if (!deleteFramesOnly) {
      unlinkSync(this.filename);
    }
    this.frames.delete();
  }

  reset() {
    this.frames.reset();
  }

  getInfo() {
    return this.frames.getInfo();
  }

  getFrames() {
    return this.frames.getFrames();
  }

  deleteFrame(index) {
    this.frames.deleteFrame(index);
  }
}

module.exports = Image;
