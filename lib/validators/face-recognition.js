const { recognizeFaces, loadDescriptorsFolder } = require('../utils/faces');
const validateFrames = require('./utils/validate-frames');

class ValidatorFaceRecognition {
  constructor({ folder }) {
    this.descriptors = loadDescriptorsFolder(folder);
  }

  get name() {
    return 'face-recognition';
  }

  async validate(image) {
    return await validateFrames({
      image,
      gifThreshold: this.gifThreshold,
      validationFn: async (file) => {
        const faces = await recognizeFaces(file, this.descriptors, false);
        return faces.length > 0;
      }
    });
  }
}

module.exports = ValidatorFaceRecognition;
