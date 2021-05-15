const { processAsStills } = require('../filters/utils');
const { findFaces, getBoundingBox } = require('../utils/faces');
const getImageInfo = require('../utils/get-image-info');

class ValidatorEyeDetection {
  constructor({ gifThreshold = 0.5, minEyeWidth = 10 } = {}) {
    this.gifThreshold = gifThreshold;
    this.minEyeWidth = minEyeWidth;
  }

  get name() {
    return 'eye-detection';
  }

  async validate(image) {
    const { numFrames } = getImageInfo(image);
    if (numFrames < 2) {
      const faces = await findFaces(image);
      return faces.length > 0;
    }
    let matchedFrames = 0;
    await processAsStills(image, async (png) => {
      const faces = await findFaces(png);
      if (faces.length > 0) {
        let matchedEyes = false;
        for (let face of faces) {
          const { width: leftWidth } = getBoundingBox(
            face.landmarks.getLeftEye()
          );
          const { width: rightWidth } = getBoundingBox(
            face.landmarks.getLeftEye()
          );
          if (leftWidth >= this.minEyeWidth && rightWidth >= this.minEyeWidth) {
            matchedEyes = true;
          }
        }
        if (matchedEyes) {
          matchedFrames += 1;
        }
      }
    });
    const numRequired = Math.floor(numFrames * this.gifThreshold);
    console.log(`🧐 Matched ${matchedFrames} (of required ${numRequired})`);
    return matchedFrames >= numRequired;
  }
}

module.exports = ValidatorEyeDetection;
