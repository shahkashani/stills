const { recognizeFaces, loadDescriptorsFolder } = require('../utils/faces');

class ValidatorFaceRecognition {
  constructor({ folder }) {
    this.descriptors = loadDescriptorsFolder(folder);
  }

  get name() {
    return 'face-recognition';
  }

  async validate(image) {
    const faces = await recognizeFaces(image, this.descriptors, false);
    return faces.length > 0;
  }
}

module.exports = ValidatorFaceRecognition;
