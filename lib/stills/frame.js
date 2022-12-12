const { unlinkSync, copyFileSync, writeFileSync, readFileSync } = require('fs');
const { getFaces: getFacesNet, getBodyMap, PARTS } = require('../utils/faces');
const getImageInfo = require('../utils/get-image-info');
const { parse } = require('path');
const imageOutput = require('image-output');
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
    this.masks = {};
    this.humans = null;
    this.isVerbose = isVerbose;
    this.bufferCache = null;
    this.isBufferChanged = false;
    this.isDeleted = false;
  }

  get parts() {
    return PARTS;
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
    this.bufferCache = null;
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
    return this.info;
  }

  async getHumans() {
    if (this.humans) {
      return this.humans;
    }
    const result = new Humans(this.original);
    this.humans = result;
    return result;
  }

  async detectHumans() {
    const humans = await this.getHumans();
    const result = await humans.detect();
    return result;
  }

  async getFaces(avoidDescriptors, isSingle = false, singleIndex = 0) {
    if (isSingle && this.faces) {
      return this.faces.length > 1 ? [this.faces[0]] : [];
    }
    this.faces = await getFacesNet(
      this.original,
      avoidDescriptors,
      this.minFaceConfidence
    );

    return isSingle
      ? this.faces.length > 1
        ? [this.faces[singleIndex]]
        : []
      : this.faces;
  }

  async getMask(segmentationThreshold = 0.85, parts = []) {
    const params = `${segmentationThreshold}${
      parts.length > 0 ? `-${parts.join(',')}` : ''
    }`;

    if (this.masks[params]) {
      return this.masks[params];
    }
    const { dir, name } = parse(this.original);
    const bodies = await this.getBodies(segmentationThreshold, parts);
    if (!bodies) {
      return null;
    }
    const mask = `${dir ? `${dir}/` : ''}${name} (mask ${params}).png`;
    imageOutput(bodies, mask);
    this.masks[params] = mask;
    return mask;
  }

  async getBodies(segmentationThreshold = 0.85, parts = []) {
    const params = `${segmentationThreshold}-${parts.join(',')}`;
    if (this.bodies[params]) {
      return this.bodies[params];
    }
    const result = await getBodyMap(
      this.original,
      segmentationThreshold,
      parts
    );
    this.bodies[params] = result;
    return result;
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
    this.deleteMasks();
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
      this.deleteMasks();
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

  deleteMasks() {
    Object.values(this.masks).forEach((m) => {
      if (this.isVerbose) {
        console.log(`❌ Deleting`, s);
      }
      unlinkSync(m);
    });
    this.masks = {};
  }

  replace(url, fixSizing = true) {
    let filename = url;

    if (fixSizing) {
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
    this.info = null;
    this.humans = null;
    this.faces = null;

    copyFileSync(filename, this.original);
    copyFileSync(filename, this.edited);
    if (filename !== url) {
      unlinkSync(filename);
    }
    this.deleteSnapshots();
    this.deleteMasks();
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
