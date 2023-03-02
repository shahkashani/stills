const Frames = require('./frames');
const { unlinkSync, copyFileSync } = require('fs');

class Image {
  constructor({ filename, minFaceConfidence, framesOptions } = {}) {
    this.filename = filename;
    this.data = {};
    this.frames = new Frames({
      filename,
      minFaceConfidence,
      ...(framesOptions || {})
    });
  }

  async getScenes() {
    return await this.frames.getScenes();
  }

  async prepare() {
    this.frames.expand();
  }

  async collect() {
    this.frames.collect();
  }

  async collapse() {
    this.frames.collapse();
  }

  setData(key, data) {
    this.data[key] = data;
  }

  getData(key) {
    return this.data[key];
  }

  deleteData(key) {
    delete this.data[key];
  }

  replace(url) {
    copyFileSync(url, this.filename);
    this.frames.delete();
    this.frames.expand(true);
  }

  replaceFrame(frame, url, isCollapse = true) {
    this.frames.frames[frame].replace(url);
    if (isCollapse) {
      this.collapse();
    }
  }

  delete(deleteFramesOnly = false) {
    if (!deleteFramesOnly) {
      unlinkSync(this.filename);
    }
    this.frames.delete();
  }

  reset(skipCollapse) {
    this.frames.reset(skipCollapse);
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
