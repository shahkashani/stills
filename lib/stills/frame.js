const { unlinkSync } = require('fs');
const { getFaces: getFacesNet, getBodyMap } = require('../utils/faces');
const getImageInfo = require('../utils/get-image-info');

class Frame {
  constructor({ original, edited }) {
    this.original = original;
    this.edited = edited;
  }

  get file() {
    return this.edited;
  }

  getInfo() {
    return getImageInfo(this.original);
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

  delete() {
    unlinkSync(this.original);
    unlinkSync(this.edited);
  }
}

module.exports = Frame;
