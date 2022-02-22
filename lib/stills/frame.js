const { unlinkSync, copyFileSync } = require('fs');
const { getFaces: getFacesNet, getBodyMap } = require('../utils/faces');
const getImageInfo = require('../utils/get-image-info');
const { parse } = require('path');

class Frame {
  constructor({ original, edited }) {
    this.original = original;
    this.edited = edited;
    this.delay = null;
    this.snapshots = {};
  }

  get file() {
    return this.edited;
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

  async getFaces(avoidDescriptors) {
    if (this.faces) {
      return this.faces;
    }
    this.faces = await getFacesNet(this.original, avoidDescriptors);
    return this.faces;
  }

  async getBodies(segmentationThreshold = 0.85) {
    if (this.bodies) {
      return this.bodies;
    }
    this.bodies = await getBodyMap(this.original, segmentationThreshold);
    return this.bodies;
  }

  async saveSnapshot(snapshotName) {
    const { name, dir } = parse(this.edited);
    const filename = `${dir}/${name} (snapshot ${snapshotName}).png`;
    copyFileSync(this.edited, filename);
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
  }

  delete() {
    unlinkSync(this.original);
    unlinkSync(this.edited);
    this.deleteSnapshots();
  }

  deleteSnapshots() {
    Object.values(this.snapshots).forEach((s) => {
      unlinkSync(s);
    });
    this.snaphots = {};
  }

  async replace(url) {
    copyFileSync(url, this.original);
    copyFileSync(url, this.edited);
    this.deleteSnapshots();
  }

  clone() {
    const date = Date.now();
    const { dir: origDir, name: origName } = parse(this.original);
    const { dir: editDir, name: editName } = parse(this.edited);
    const original = `${origDir}/Clone (${date}) ${origName}.png`;
    const edited = `${editDir}/Clone (${date}) ${editName}.png`;
    copyFileSync(this.original, original);
    copyFileSync(this.original, edited);
    return new Frame({ original, edited });
  }
}

module.exports = Frame;
