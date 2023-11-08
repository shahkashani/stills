const Image = require('../stills/image');
const sharp = require('../utils/sharp');

class FilterOverlay {
  constructor({
    overlayFile = null,
    gravity = 'center',
    opacity = 1,
    width = null,
    height = null,
    vertical = null,
    horizontal = null
  } = {}) {
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
        ? sharp(overlayBuffer)
            .resize(size.width, size.height)
            .extend({
              top: paddingVertical,
              bottom: paddingVertical,
              left: paddingHorizontal,
              right: paddingHorizontal,
              background: 'transparent'
            })
            .ensureAlpha(this.opacity)
        : sharp(overlayBuffer)
            .ensureAlpha(this.opacity)
            .resize(width, height, { fit: 'contain' });

    return sharp(frame.buffer)
      .composite([
        { input: await foreground.toBuffer(), gravity: this.gravity }
      ])
      .removeAlpha()
      .toBuffer();
  }

  async setup() {
    if (this.overlayFile.match(/\.(gif|mp4)$/i)) {
      this.gif = new Image({ filename: this.overlayFile });
      await this.gif.prepare();
    }
  }

  async applyFrame(frame, { image, numFrame }) {
    const { width, height } = image.getInfo();
    if (this.gif) {
      const frames = this.gif.getFrames();
      const index = numFrame % frames.length;
      const gifFrame = frames[index];
      frame.buffer = await this.getNewBuffer(
        frame,
        gifFrame.buffer,
        width,
        height
      );
    } else {
      frame.buffer = await this.getNewBuffer(
        frame,
        this.overlayFile,
        width,
        height
      );
    }
  }

  async teardown() {
    if (this.gif) {
      await this.gif.frames.delete();
    }
  }
}

module.exports = FilterOverlay;
