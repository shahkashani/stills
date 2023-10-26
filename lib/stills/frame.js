const { unlinkSync, copyFileSync, writeFileSync, readFileSync } = require('fs');
const getImageInfo = require('../utils/get-image-info');
const { parse } = require('path');
const execCmd = require('../utils/exec-cmd');
const matchImageSize = require('../utils/match-image-size');
const Humans = require('../utils/humans');

class Frame {
  constructor({
    original,
    edited,
    minFaceConfidence,
    index,
    isVerbose = false
  }) {
    this.original = original;
    this.index = index;
    this.edited = edited;
    this.delay = null;
    this.minFaceConfidence = minFaceConfidence;
    this.snapshots = {};
    this.bodies = {};
    this.humans = null;
    this.isVerbose = isVerbose;
    this.bufferCache = null;
    this.isBufferChanged = false;
    this.isDeleted = false;
  }

  get file() {
    return this.edited;
  }

  get buffer() {
    if (this.bufferCache) {
      return this.bufferCache;
    }
    this.bufferCache = readFileSync(this.file);
    return this.bufferCache;
  }

  get originalBuffer() {
    if (this.originalBufferCache) {
      return this.originalBufferCache;
    }
    this.originalBufferCache = readFileSync(this.original);
    return this.originalBufferCache;
  }

  set buffer(newBuffer) {
    this.isBufferChanged = true;
    this.bufferCache = newBuffer;
    return newBuffer;
  }

  saveBuffer() {
    if (!this.isBufferChanged || !this.bufferCache) {
      return;
    }
    writeFileSync(this.edited, this.bufferCache);
    this.isBufferChanged = false;
  }

  resetBuffer() {
    delete this.bufferCache;
    this.isBufferChanged = false;
  }

  resetInfo() {
    delete this.info;
  }

  resetHumans() {
    delete this.faces;
    delete this.humans;
    delete this.humansResult;
  }

  release() {
    this.resetInfo();
    this.resetHumans();
    this.resetBuffer();
  }

  getDelay() {
    return this.delay;
  }

  setDelay(delay) {
    this.delay = delay;
  }

  getInfo() {
    if (this.info) {
      return this.info;
    }
    this.info = getImageInfo(this.original);
    console.log('ℹ️  Frame info', this.info);
    return this.info;
  }

  async getHumans() {
    if (this.humans) {
      return this.humans;
    }
    this.humans = new Humans(this.buffer);
    return this.humans;
  }

  async detectHumans() {
    if (this.humansResult) {
      return this.humansResult;
    }
    const humans = await this.getHumans();
    const result = await humans.detect();
    this.humansResult = result;
    return result;
  }

  async getFaces() {
    const result = await this.detectHumans();
    return result && result.face ? result.face : [];
  }

  async saveSnapshot(snapshotName, buffer = null) {
    const { name, dir } = parse(this.edited);
    const filename = `${
      dir ? `${dir}/` : ''
    }${name} (snapshot ${snapshotName}).png`;

    if (buffer) {
      writeFileSync(filename, buffer);
    } else {
      copyFileSync(this.edited, filename);
    }
    this.snapshots[snapshotName] = filename;
    return filename;
  }

  getSnapshot(snapshotName) {
    if (!snapshotName) {
      return this.edited;
    }
    if (!this.snapshots[snapshotName]) {
      console.warn(`No snapshot named ${snapshotName} for ${this.edited}`);
      return null;
    }
    return this.snapshots[snapshotName];
  }

  reset() {
    copyFileSync(this.original, this.edited);
    this.deleteSnapshots();
    this.resetBuffer();
  }

  delete() {
    this.isDeleted = true;
    try {
      if (this.isVerbose) {
        console.log(`❌ Deleting`, this.original);
      }
      unlinkSync(this.original);
      if (this.isVerbose) {
        console.log(`❌ Deleting`, this.edited);
      }
      unlinkSync(this.edited);
      this.deleteSnapshots();
    } catch (err) {
      console.error(err);
    }
  }

  deleteSnapshots() {
    Object.values(this.snapshots).forEach((s) => {
      if (this.isVerbose) {
        console.log(`❌ Deleting`, s);
      }
      unlinkSync(s);
    });
    this.snaphots = {};
  }

  replace(url, fixSizing = true) {
    let filename = url;

    if (fixSizing) {
      console.log('✨ Fixing replace sizing');
      const newSize = matchImageSize(this.getInfo(), getImageInfo(url));
      if (newSize) {
        const { dir, name } = parse(url);
        filename = `${dir ? `${dir}/` : ''}Resized ${name}`;
        execCmd(
          `convert "${url}" -scale ${newSize.width}x${
            newSize.height
          } -gravity center ${
            newSize.crop ? `-crop ${newSize.crop}+0+0` : ''
          } +repage "${filename}"`
        );
      }
    }

    copyFileSync(filename, this.original);
    copyFileSync(filename, this.edited);
    this.release();

    if (filename !== url) {
      unlinkSync(filename);
    }
    this.deleteSnapshots();
  }

  clone() {
    const date = Date.now();
    const { dir: origDir, name: origName } = parse(this.original);
    const { dir: editDir, name: editName } = parse(this.edited);
    const original = `${
      origDir ? `${origDir}/` : ''
    }Clone (${date}) ${origName}.png`;
    const edited = `${
      editDir ? `${editDir}/` : ''
    }Clone (${date}) ${editName}.png`;
    copyFileSync(this.original, original);
    copyFileSync(this.original, edited);
    return new Frame({ original, edited, index: this.index });
  }
}

module.exports = Frame;
