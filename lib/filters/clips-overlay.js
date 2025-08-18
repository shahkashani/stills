const sharp = require('../utils/sharp');
const getFrames = require('../content/utils/get-frames');
const { getVideoLength } = require('../content/utils');

class FilterClipsOverlay {
  constructor({
    source,
    fit = 'contain',
    caption = 'Up next on Food Network',
    width = 0.3,
    position = 'top'
  }) {
    this.source = source;
    this.fit = fit;
    this.caption = caption;
    this.width = width;
    this.position = position;
  }

  get name() {
    return 'clips-overlay';
  }

  async setup({ image }) {
    const { width, height, numFrames, fps } = await image.getInfo();
    const clip = await this.source.get();
    const clipLength = getVideoLength(clip.input);

    const gifLengthSeconds = numFrames / fps;
    const allowedLength = clipLength - gifLengthSeconds;
    const seconds = Math.round(Math.random() * allowedLength);

    const buffers = await getFrames(clip.input, seconds, numFrames);

    const { width: clipWidth, height: clipHeight } = await sharp(
      buffers[0]
    ).metadata();

    const thumbWidth = Math.floor(width * this.width);
    const thumbHeight = Math.floor((thumbWidth / clipWidth) * clipHeight);
    const thumbRadius = 18;

    const resized = await Promise.all(
      buffers.map(async (buffer) => {
        const roundedCorner = Buffer.from(
          `<svg><rect x="0" y="0" width="${Math.floor(
            thumbWidth
          )}" height="${Math.floor(
            thumbHeight
          )}" rx="${thumbRadius}" ry="${thumbRadius}"/></svg>`
        );

        // Add a 4px yellow border with rounded corners
        const borderOverlay = Buffer.from(
          `<svg width="${thumbWidth}" height="${thumbHeight}">
      <rect x="2" y="2" width="${thumbWidth - 4}" height="${
            thumbHeight - 4
          }" rx="${thumbRadius - 2}" ry="${thumbRadius - 2}"
        fill="none" stroke="#f0c902" stroke-width="4"/>
      </svg>`
        );

        const textShadowOverlay = Buffer.from(
          `<svg width="${thumbWidth}" height="${thumbHeight}">
      <text x="21" y="${
        thumbHeight - 14
      }" font-size="12" fill="black" font-family="Arial" font-weight="bold" text-anchor="start">${
            this.caption
          }</text>
      </svg>`
        );

        const textOverlay = Buffer.from(
          `<svg width="${thumbWidth}" height="${thumbHeight}">
      <text x="20" y="${
        thumbHeight - 15
      }" font-size="12" fill="#f0c902" font-family="Arial" font-weight="bold" text-anchor="start">${
            this.caption
          }</text>
      </svg>`
        );

        return await sharp(buffer)
          .resize(thumbWidth, thumbHeight, {
            background: 'transparent',
            fit: 'cover'
          })
          .composite([
            { input: roundedCorner, blend: 'dest-in' },
            { input: borderOverlay, blend: 'over' },
            { input: textShadowOverlay, blend: 'over' },
            { input: textOverlay, blend: 'over' }
          ])
          .toBuffer();
      })
    );

    const frames = image.getFrames();

    for (let sceneIndex = 0; sceneIndex < numFrames; sceneIndex += 1) {
      const baseBuffer = frames[sceneIndex].buffer;
      const overlayBuffer = resized[sceneIndex % resized.length];

      // Composite overlay in lower right corner
      const compositeImage = await sharp(baseBuffer)
        .composite([
          {
            input: overlayBuffer,
            gravity: 'southeast',
            left: width - thumbWidth - 10,
            top: this.position === 'top' ? 10 : height - thumbHeight - 10
          }
        ])
        .toBuffer();

      frames[sceneIndex].buffer = compositeImage;
    }
  }
}

module.exports = FilterClipsOverlay;
