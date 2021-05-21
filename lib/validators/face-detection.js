const { findFaces } = require('../utils/faces');
const validateFrames = require('./utils/validate-frames');

class ValidatorFaceDetection {
  constructor({ gifThreshold = 0.5 } = {}) {
    this.gifThreshold = gifThreshold;
  }

  get name() {
    return 'face-detection';
  }

  async validate(image) {
    return await validateFrames({
      image,
      gifThreshold: this.gifThreshold,
      validationFn: async (file) => {
        const faces = await findFaces(file);
        return faces.length > 0;
      }
    });
  }
}

module.exports = ValidatorFaceDetection;
