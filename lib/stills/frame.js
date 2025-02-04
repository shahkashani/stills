const sizeOf = require('image-size');
const Humans = require('../utils/humans');

class Frame {
  constructor({ minFaceConfidence, index, buffer, isVerbose = false }) {
    this.index = index;
    this.minFaceConfidence = minFaceConfidence;
    this.snapshots = {};
    this.bodies = {};
    this.humans = null;
    this.isVerbose = isVerbose;
    this.bufferCache = null;
    this.isDeleted = false;
    this.originalBuffer = buffer;
    this.buffer = buffer;
  }

  get buffer() {
    return this._buffer;
  }

  set buffer(buffer) {
    this.modified = Date.now();
    this._buffer = buffer;
  }

  resetBuffer() {
    this.buffer = this.originalBuffer;
  }

  resetHumans() {
    delete this.humans;
    delete this.humansResult;
  }

  reset() {
    this.resetHumans();
    this.resetBuffer();
    this.resetSnapshots();
  }

  resetSnapshots() {
    this.snaphots = {};
  }

  getInfo() {
    return sizeOf(this.buffer);
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

  async saveSnapshot(snapshotName, buffer) {
    this.snapshots[snapshotName] = buffer;
    return buffer;
  }

  getSnapshot(snapshotName) {
    if (!snapshotName) {
      return null;
    }
    if (!this.snapshots[snapshotName]) {
      console.warn(`No snapshot named ${snapshotName} for frame ${this.index}`);
      return null;
    }
    return this.snapshots[snapshotName];
  }

  delete() {
    this.isDeleted = true;
    this.reset();
  }

  // @todo Migrate to buffers, use "resize" with "contain" to match image size
  replace(url, fixSizing = true) {
    this.reset();
  }
}

module.exports = Frame;
