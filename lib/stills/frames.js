const { parse } = require('path');
const { sync } = require('glob');
const Frame = require('./frame');
const execCmd = require('../utils/exec-cmd');
const getImageInfo = require('../utils/get-image-info');

class Frames {
  constructor({ filename }) {
    this.original = filename;
    this.frames = [];
    const { name, dir } = parse(filename);
    this.basename = name;
    this.dir = dir;
  }

  get file() {
    return this.original;
  }

  getOriginalBase() {
    return `${this.dir}/${this.basename} (original)`;
  }

  getEditedBase() {
    return `${this.dir}/${this.basename} (edited)`;
  }

  getInfo() {
    return getImageInfo(this.original);
  }

  async expand() {
    const input = this.original;
    const originalBase = this.getOriginalBase();
    const editedBase = this.getEditedBase();

    if (sync(`${originalBase}*.png`).length === 0) {
      execCmd(
        `convert -coalesce "${input}" -write "${editedBase} %02d.png" "${originalBase} %02d.png"`
      );
    } else {
      console.log(`🚥 Frames already exist, skipping collapse.`);
    }

    const originalPngs = sync(`${originalBase} [0-9][0-9].png`);
    const editedPngs = sync(`${editedBase} [0-9][0-9].png`);

    this.frames = originalPngs.map((original, i) => {
      return new Frame({ original, edited: editedPngs[i] });
    });
  }

  getDelay() {
    return execCmd(
      `convert "${this.original}" -format "%T\n" info: | head -n 1`
    )
      .replace(/[\n\r]/, '')
      .trim();
  }

  collapse() {
    const output = this.original;
    const delay = this.getDelay();
    console.log(`💉 Collapsing frames into GIF (${delay}ms delay)`);
    const files = this.frames.map((frame) => `"${frame.edited}"`).join(' ');
    execCmd(`convert ${files} -dither None +remap "${output}"`);
    execCmd(`convert -delay ${delay} "${output}" "${output}"`);
  }

  delete() {
    this.frames.forEach((frame) => frame.delete());
  }

  reset() {
    this.frames.forEach((frame) => frame.reset());
  }

  getFrames() {
    return this.frames;
  }
}

module.exports = Frames;