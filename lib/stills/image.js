const Frames = require('./frames');
const { unlinkSync, copyFileSync } = require('fs');
const { isAngled } = require('../utils/faces');

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

  async isAcceptable({ ratio = 0.3 } = {}) {
    const acceptableCount = Math.round(this.frames.frames.length * ratio);
    let faceFrames = 0;
    for (const frame of this.frames.frames) {
      const result = await frame.detectHumans();
      if (result.face.length > 0) {
        faceFrames += 1;
        const facingCenter = result.gesture.filter(
          (gesture) => 'face' in gesture && gesture.gesture === 'facing center'
        );
        if (facingCenter.length === 0) {
          return false;
        }
      }
    }
    return faceFrames >= acceptableCount;
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

  deleteFrame(index) {
    this.frames.deleteFrame(index);
  }
}

module.exports = Image;
