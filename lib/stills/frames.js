const { parse } = require('path');
const { sync } = require('glob');
const Frame = require('./frame');
const execCmd = require('../utils/exec-cmd');
const getImageInfo = require('../utils/get-image-info');

class Frames {
  constructor({ filename }) {
    this.original = filename;
    this.frames = [];
    const { name } = parse(filename);
    this.basename = name;
  }

  get file() {
    return this.original;
  }

  getOriginalBase() {
    return `${this.basename} (original)`;
  }

  getEditedBase() {
    return `${this.basename} (edited)`;
  }

  getInfo() {
    return getImageInfo(this.original);
  }

  async expand() {
    const input = this.original;
    const originalBase = this.getOriginalBase();
    const editedBase = this.getEditedBase();
    execCmd(
      `convert -coalesce "${input}" -write "${editedBase} %02d.png" "${originalBase} %02d.png"`
    );
    const originalPngs = sync(`${originalBase}*.png`);
    const editedPngs = sync(`${editedBase}*.png`);
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
    execCmd(`convert "${this.getEditedBase()}*.png" "${output}"`);
    execCmd(`convert -delay ${delay} "${output}" "${output}"`);
  }

  delete() {
    this.frames.forEach((frame) => frame.delete());
  }

  getFrames() {
    return this.frames;
  }
}

module.exports = Frames;
