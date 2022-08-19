const { unlinkSync, copyFileSync, writeFileSync } = require('fs');
const { getFaces: getFacesNet, getBodyMap, PARTS } = require('../utils/faces');
const getImageInfo = require('../utils/get-image-info');
const { parse } = require('path');
const imageOutput = require('image-output');
const execCmd = require('../utils/exec-cmd');
const getBoundingBox = require('../utils/get-bounding-box');
const matchImageSize = require('../utils/match-image-size');
const Humans = require('../utils/humans');

class Frame {
  constructor({ original, edited, minFaceConfidence, isVerbose = false }) {
    this.original = original;
    this.edited = edited;
    this.delay = null;
    this.minFaceConfidence = minFaceConfidence;
    this.snapshots = {};
    this.bodies = {};
    this.masks = {};
    this.layers = {};
    this.humans = null;
    this.isVerbose = isVerbose;
  }

  get parts() {
    return PARTS;
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
    return humans.detect();
  }

  async getFaces(avoidDescriptors, isSingle = false) {
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
        ? [this.faces[0]]
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
  }

  delete() {
    try {
      if (this.isVerbos) {
        console.log(`❌ Deleting`, this.original);
      }
      unlinkSync(this.original);
      if (this.isVerbos) {
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
      if (this.isVerbos) {
        console.log(`❌ Deleting`, s);
      }
      unlinkSync(s);
    });
    this.snaphots = {};
  }

  deleteMasks() {
    Object.values(this.masks).forEach((m) => {
      if (this.isVerbos) {
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
    return new Frame({ original, edited });
  }

  async copyLayer(layer, points, stroke = 0) {
    let strokeWidth = 0;
    let blurWidth = 0;
    if (stroke > 0) {
      const { width } = getBoundingBox(points);
      strokeWidth = width * stroke;
      blurWidth = width * stroke;
    }
    const { dir, name } = parse(this.original);
    const file = `${dir ? `${dir}/` : ''}${name} (layer ${layer}).png`;
    const position = getBoundingBox(points, strokeWidth * 4 + blurWidth * 4);
    const polygon = points.map(({ x, y }) => `${x},${y}`).join(' ');
    execCmd(
      `convert "${this.original}" -alpha set -background none -fill white -stroke white \\( +clone -channel A -evaluate set 0 +channel -strokewidth ${strokeWidth} -draw "polygon ${polygon}" -blur 0x${blurWidth} \\) -compose dstin -composite -crop ${position.width}x${position.height}+${position.x}+${position.y} "${file}"`
    );
    this.layers[layer] = {
      position,
      file
    };
    return this.layers[layer];
  }

  async pasteLayer(layer, options = {}) {
    const { position, file } = this.layers[layer];
    let x = position.x + (options.x || 0) * width;
    let y = position.y + (options.y || 0) * height;
    const width = (options.size || 1) * position.width;
    const height = (options.size || 1) * position.height;
    if (options.size) {
      x -= Math.abs(position.width - width) / 2;
      y -= Math.abs(position.height - height) / 2;
    }
    const size = `${width}x${height}`;
    const geometry = `+${x}+${y}`;
    const flip = options.flip ? `-flip` : '';
    const opacity = options.opacity
      ? `-matte -channel A +level 0,${options.opacity * 100}%`
      : '';
    execCmd(
      `convert "${this.edited}" -coalesce null: \\( "${file}" -resize ${size} ${flip} ${opacity} +repage \\) -geometry ${geometry} -layers composite "${this.edited}"`
    );
  }

  getLayer(layer) {
    return this.layers[layer];
  }
}

module.exports = Frame;
