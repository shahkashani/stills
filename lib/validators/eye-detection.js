const validateFrames = require('./utils/validate-frames');
const getBoundingBox = require('../utils/get-bounding-box');

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
      validationFn: async (frame) => {
        const faces = await frame.getFaces();
        if (faces.length > 0) {
          for (let face of faces) {
            const { width: left } = getBoundingBox(
              face.annotations.leftEyeIris
            );
            const { width: right } = getBoundingBox(
              face.annotations.rightEyeIris
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
