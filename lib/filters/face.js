const Image = require('../stills/image');
const sharp = require('../utils/sharp');
const getBoundingBox = require('../utils/get-bounding-box');

class FilterFace {
  constructor({ overlayFile = null, opacity = 1 } = {}) {
    this.opacity = opacity;
    this.overlayFile = overlayFile;
  }

  get name() {
    return 'face';
  }

  getSize(width, height) {
    if (this.width) {
      return { width: Math.round(width * this.width) };
    }
    if (this.height) {
      return { height: Math.round(height * this.height) };
    }
    return { width: height };
  }

  async setup() {
    this.overlay = new Image({
      filename: this.overlayFile,
      keepOriginal: true
    });
    await this.overlay.prepare();
  }

  async applyFrame(frame, { image, numFrame }) {
    const result = await frame.detectHumans();
    const faces = result.face;
    if (faces.length === 0) {
      return frame.buffer;
    }

    const frames = this.overlay.getFrames();
    const index = numFrame % frames.length;
    const gifFrame = frames[index];

    const buffers = [];

    for (const face of faces) {
      const { width, x, y } = getBoundingBox(face.annotations.silhouette);
      const factor = width * 0.5;
      const input = await sharp(gifFrame.buffer)
        .resize(Math.round(width + factor))
        .ensureAlpha(this.opacity)
        .toBuffer();

      buffers.push({
        input,
        left: Math.round(x - factor / 2),
        top: Math.round(y - factor)
      });
    }

    frame.buffer = await sharp(frame.buffer)
      .composite(buffers)
      .removeAlpha()
      .toBuffer();
  }

  async teardown() {
    this.overlay.delete();
  }
}

module.exports = FilterFace;
