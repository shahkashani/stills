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

  async isAcceptable({ ratio = 0.5, minFaces = 1 } = {}) {
    const acceptableCount = this.frames.frames.length * ratio;
    let count = 0;
    let isCounting = false;
    for (const frame of this.frames.frames) {
      const faces = await frame.getFaces();
      let acceptableFaces = 0;
      for (const face of faces) {
        if (!isAngled(face)) {
          acceptableFaces += 1;
        }
      }
      if (faces.length > 0) {
        console.log(
          `👨‍🎤 Found ${faces.length} face(s), ${acceptableFaces} well-angled.`
        );
      }
      if (
        acceptableFaces >= minFaces
      ) {
        isCounting = true;
      } else if (isCounting) {
        return count >= acceptableCount;
      }
      if (isCounting) {
        count += 1;
      }
    }
    return count >= acceptableCount;
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
