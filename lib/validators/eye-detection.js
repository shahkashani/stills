const { findFaces, getBoundingBox } = require('../utils/faces');
const validateFrames = require('./utils/validate-frames');

class ValidatorEyeDetection {
  constructor({ gifThreshold = 0.5, minEyeWidth = 10 } = {}) {
    this.gifThreshold = gifThreshold;
    this.minEyeWidth = minEyeWidth;
  }

  get name() {
    return 'eye-detection';
  }

  async validate(image) {
    return await validateFrames({
      image,
      gifThreshold: this.gifThreshold,
      validationFn: async (file) => {
        const faces = await findFaces(file);
        if (faces.length > 0) {
          for (let face of faces) {
            const { width: left } = getBoundingBox(face.landmarks.getLeftEye());
            const { width: right } = getBoundingBox(
              face.landmarks.getRightEye()
            );
            if (left >= this.minEyeWidth && right >= this.minEyeWidth) {
              return true;
            }
          }
        }
        return false;
      }
    });
  }
}

module.exports = ValidatorEyeDetection;
