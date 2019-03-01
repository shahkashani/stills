const { findFaces } = require('./face-utils');

class ValidatorFaceDetection {
  get name() {
    return 'face-detection';
  }

  async validate(image) {
    const faces = await findFaces(image);
    return faces.length > 0;
  }
}

module.exports = ValidatorFaceDetection;
