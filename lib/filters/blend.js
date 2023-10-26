const { transformFrames } = require('./utils');
const videoToGif = require('../utils/video-to-gif');
const { random } = require('lodash');
const { unlinkSync } = require('fs');
const getImageInfo = require('../utils/get-image-info');
const fileToFrames = require('../utils/file-to-frames');

class FilterBlend {
  constructor({ overlayFile = null, opacity = 0.3 } = {}) {
    this.overlayFile = overlayFile;
    this.opacity = opacity;
  }

  get name() {
    return 'blend';
  }

  transform(overlayFrames, base, frame, count, total) {
    const buf = Buffer.alloc(base.length);
    const overlayIndex = Math.ceil(
      overlayFrames.frames.length * (count / total)
    );
    const avgFrame = overlayFrames.frames[overlayIndex];
    for (let j = 0; j < buf.length; j++) {
      buf[j] = this.opacity * avgFrame.data[j] + (1 - this.opacity) * frame[j];
    }
    return buf;
  }

  async applyFrames(frames) {
    const file = frames.file;
    const { fps, duration, width, height } = frames.getInfo();
    const overlayConverted = file.replace(/\.gif$/, '-overlay.gif');

    const availableDuration =
      getImageInfo(this.overlayFile).duration - duration;
    const start = random(0, availableDuration);

    videoToGif(
      this.overlayFile,
      overlayConverted,
      fps,
      duration,
      width,
      height,
      start
    );
    const overlayFrames = await fileToFrames(overlayConverted);
    await transformFrames(file, (...args) =>
      this.transform(overlayFrames, ...args)
    );
    unlinkSync(overlayConverted);
  }
}

module.exports = FilterBlend;
