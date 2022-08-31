const { parse } = require('path');
const { sync } = require('glob');
const Frame = require('./frame');
const execCmd = require('../utils/exec-cmd');
const getImageInfo = require('../utils/get-image-info');
const getScenes = require('../utils/get-scenes');
const { compact } = require('lodash');
const { copyFileSync } = require('fs');

class Frames {
  constructor({ filename, minFaceConfidence, width, fps = 16 }) {
    this.original = filename;
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
    return this.original;
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

  async getScenes() {
    if (this.scenes) {
      return this.scenes;
    }
    this.scenes = await getScenes(this.original);
    return this.scenes;
  }

  expand(isForce = false) {
    const input = this.original;
    const originalBase = this.getOriginalBase();
    const editedBase = this.getEditedBase();
    const isVideo = this.isVideo();

    if (isForce || sync(`${originalBase}*.png`).length === 0) {
      console.log(isVideo ? `🚥 Expanding video.` : `🚥 Expanding image.`);

      if (isVideo) {
        const widthCmd = this.width
          ? `,scale=${this.width}:${this.width}/dar`
          : '';
        execCmd(
          `ffmpeg -i "${input}" -q:v 5 -filter_complex "fps=${this.fps}${widthCmd}" -y "${originalBase} %04d.png"`
        );
        sync(`${originalBase} [0-9][0-9][0-9][0-9].png`).map((file) =>
          copyFileSync(file, file.replace('original', 'edited'))
        );
      } else {
        execCmd(
          `convert -coalesce "${input}" -write "${editedBase} %04d.png" "${originalBase} %04d.png"`
        );
      }
    } else {
      console.log(`🚥 Frames already exist, skipping collapse.`);
    }

    this.collect();
  }

  collect() {
    const originalBase = this.getOriginalBase();
    const editedBase = this.getEditedBase();
    const originalPngs = sync(`${originalBase} [0-9][0-9][0-9][0-9].png`);
    const editedPngs = sync(`${editedBase} [0-9][0-9][0-9][0-9].png`);

    this.frames = originalPngs.map((original, i) => {
      return new Frame({
        original,
        edited: editedPngs[i],
        minFaceConfidence: this.minFaceConfidence
      });
    });
  }

  getDelay() {
    const output = execCmd(
      `convert "${this.original}" -format "%T\n" info: | head -n 1`
    )
      .replace(/[\n\r]/, '')
      .trim();

    return !output ? null : parseInt(output);
  }

  getFrameDelay(frame) {
    const delay = this.getDelay() || 8;
    const frameDelay = frame.getDelay();
    return Number.isFinite(frameDelay) ? frameDelay : delay;
  }

  collapse() {
    const output = this.isVideo() ? this.edited : this.original;
    console.log(
      `💉 Collapsing frames into ${this.isVideo() ? 'video' : 'image'}`
    );

    console.log('💉 Saving buffers');

    const frames = this.getFrames();

    frames.forEach((frame) => frame.saveBuffer());

    if (this.isVideo()) {
      execCmd(
        `ffmpeg -framerate ${
          this.fps
        }  -pattern_type glob -i "${this.getEditedBase()} ????.png" -vf format=yuv420p -y "${
          this.edited
        }"`
      );
    } else {
      const files = frames
        .map((frame) => {
          const useDelay = this.getFrameDelay(frame);
          const delayCmd = Number.isFinite(useDelay)
            ? `-delay ${useDelay}`
            : '';
          return `${delayCmd} "${frame.edited}"`;
        })
        .join(' ');
        
      execCmd(`convert ${files} -dither None +remap "${output}"`);
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
    return compact(this.frames);
  }

  deleteFrame(index) {
    const frame = this.frames[index];
    if (frame) {
      frame.delete();
    }
    this.frames[index] = null;
  }
}

module.exports = Frames;
