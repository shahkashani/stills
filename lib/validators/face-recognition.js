const glob = require('glob');
const { recognizeFaces, loadDescriptors } = require('./face-utils');

class ValidatorFaceRecognition {
  constructor({ folder }) {
    this.descriptors = glob
      .sync(`${folder}/*.json`)
      .map(file => loadDescriptors(file));
  }

  get name() {
    return 'face-recognition';
  }

  async validate(image) {
    const faces = await recognizeFaces(image, this.descriptors);
    return faces.length > 0;
  }
}

module.exports = ValidatorFaceRecognition;
