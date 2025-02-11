const { parse } = require('path');
const { sync } = require('glob');
const { compact } = require('lodash');
const GIF = require('sharp-gif2');
const { readFileSync, unlinkSync, copyFileSync } = require('fs');
const Frame = require('./frame');
const sharp = require('../utils/sharp');
const execCmd = require('../utils/exec-cmd');
const getImageInfo = require('../utils/get-image-info');
const makeGif = require('../content/utils/make-gif');
const makePng = require('../content/utils/make-png');

class Frames {
  constructor({ filename, buffers, minFaceConfidence, width, fps = 12 }) {
    this.original = filename;
    this.buffers = buffers;
    this.minFaceConfidence = minFaceConfidence;
    this.frames = [];
    const { name, dir, ext } = parse(filename);
    this.basename = name;
    this.ext = ext;
    this.dir = dir;
    this.fps = fps;
    this.width = width;
    this.edited = this.getEditedName();
  }

  get length() {
    return this.getFrames().length;
  }

  get file() {
    return this.edited;
  }

  isVideo() {
    return this.ext === '.mp4';
  }

  getEditedName() {
    return `${this.dir ? `${this.dir}/` : ''}${this.basename} - output${
      this.ext
    }`;
  }

  getOriginalBase() {
    return `${this.dir ? `${this.dir}/` : ''}${this.basename} (original)`;
  }

  getEditedBase() {
    return `${this.dir ? `${this.dir}/` : ''}${this.basename} (edited)`;
  }

  getInfo() {
    if (this.info) {
      return this.info;
    }
    this.info = getImageInfo(this.original);
    if (this.isVideo()) {
      const frameInfo = this.getFrames()[0].getInfo();
      this.info.width = frameInfo.width;
      this.info.height = frameInfo.height;
    }
    return this.info;
  }

  isGif() {
    if (this.isVideo()) {
      return false;
    }
    return this.length > 1;
  }

  createEditedCopy() {
    copyFileSync(this.original, this.edited);
  }

  async expand() {
    const input = this.original;
    const originalBase = this.getOriginalBase();
    const isVideo = this.isVideo();
    const minFaceConfidence = this.minFaceConfidence;

    if (this.buffers && this.buffers.length > 0) {
      console.log('🖖 Generating frames from existing buffers');
      this.frames = this.buffers.map(
        (buffer, index) =>
          new Frame({
            buffer,
            index,
            minFaceConfidence
          })
      );
      this.createEditedCopy();
      return;
    }

    // @todo Deprecate all the stuff below here
    if (isVideo) {
      console.log('🖖 Reading video into buffers');

      const widthCmd = this.width
        ? `,scale=${this.width}:${this.width}/dar`
        : '';
      execCmd(
        `ffmpeg -i "${input}" -q:v 5 -filter_complex "fps=${this.fps}${widthCmd}" -y "${originalBase} %04d.png"`
      );
      this.frames = sync(`${originalBase} [0-9][0-9][0-9][0-9].png`).map(
        (file, index) => {
          const buffer = readFileSync(file);
          unlinkSync(file);
          return new Frame({
            buffer,
            index,
            minFaceConfidence
          });
        }
      );
    } else {
      console.log('🖖 Reading image into buffers');

      const reader = GIF.readGif(sharp(this.original, { animated: true }));
      const frames = await reader.toFrames();
      const buffers = await Promise.all(
        frames.map((frame) => frame.toBuffer())
      );

      this.frames = buffers.map(
        (buffer, index) =>
          new Frame({
            buffer,
            index,
            minFaceConfidence
          })
      );
    }

    this.createEditedCopy();
  }

  async collapse() {
    const output = this.file;
    console.log(
      `💉 Collapsing frames into ${this.isVideo() ? 'video' : 'image'}`
    );
    if (this.isVideo()) {
      // Implement this
    } else if (this.isGif()) {
      await makeGif(
        output,
        this.getFrames().map((frame) => frame.buffer),
        this.fps,
        false,
        true
      );
    } else {
      await makePng(output, this.getFrames()[0].buffer);
    }
  }

  delete() {
    this.getFrames().forEach((frame) => frame.delete());
  }

  reset(skipCollapse = false) {
    this.getFrames().forEach((frame) => frame.reset());
    if (!skipCollapse) {
      this.collapse();
    }
  }

  getFrames() {
    return compact(this.frames).filter((f) => !f.isDeleted);
  }

  deleteFrame(index) {
    const frame = this.getFrames().find((frame) => frame.index === index);
    const realIndex = this.frames.indexOf(frame);
    if (frame) {
      frame.delete();
    }
    this.frames[realIndex] = null;
  }
}

module.exports = Frames;
