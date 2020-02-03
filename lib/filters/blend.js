const { transformFrames, fileToFrames } = require("./utils");
const videoToGif = require("../utils/video-to-gif");
const getImageInfo = require("../utils/get-image-info");
const { random } = require("lodash");
const { unlinkSync } = require("fs");

class FilterBlend {
  constructor({ overlayFile = null, opacity = 0.2 } = {}) {
    this.overlayFile = overlayFile;
    this.opacity = opacity;
  }

  get name() {
    return "blend";
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

  async apply(file, getInfo) {
    const { fps, duration, width, height } = getInfo();
    const overlayConverted = file.replace(/\.gif$/, "-overlay.gif");

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
