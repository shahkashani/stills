const Image = require('../stills/image');
const sharp = require('../utils/sharp');

class FilterOverlay {
  constructor({
    overlayFile = null,
    gravity = 'center',
    fit = 'contain',
    opacity = 1,
    width = null,
    height = null,
    vertical = null,
    horizontal = null
  } = {}) {
    this.fit = fit;
    this.width = width;
    this.height = height;
    this.opacity = opacity;
    this.overlayFile = overlayFile;
    this.gravity = gravity;
    this.horizontal = horizontal;
    this.vertical = vertical;
  }

  get name() {
    return 'overlay';
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

  async getNewBuffer(frame, overlayBuffer, width, height) {
    const size = this.getSize(width, height);
    const paddingHorizontal = this.horizontal
      ? Math.round(this.horizontal * width)
      : 0;
    const paddingVertical = this.vertical
      ? Math.round(this.vertical * height)
      : 0;

    const foreground =
      this.width || this.height
        ? sharp(overlayBuffer).resize(size.width, size.height).extend({
            top: paddingVertical,
            bottom: paddingVertical,
            left: paddingHorizontal,
            right: paddingHorizontal,
            background: 'transparent'
          })
        : sharp(overlayBuffer).resize(width, height, {
            background: 'transparent',
            fit: this.fit
          });

    return sharp(frame.buffer)
      .composite([
        {
          input: await foreground.ensureAlpha(this.opacity).toBuffer(),
          gravity: this.gravity
        }
      ])
      .removeAlpha()
      .toBuffer();
  }

  async setup() {
    this.overlay = new Image({
      filename: this.overlayFile,
      keepOriginal: true
    });
    await this.overlay.prepare();
  }

  async applyFrame(frame, { image, numFrame }) {
    const { width, height } = image.getInfo();
    const frames = this.overlay.getFrames();
    const index = numFrame % frames.length;
    const gifFrame = frames[index];
    frame.buffer = await this.getNewBuffer(
      frame,
      gifFrame.buffer,
      width,
      height
    );
  }

  async teardown() {
    this.overlay.delete();
  }
}

module.exports = FilterOverlay;
