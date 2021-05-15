const { processAsStills } = require('../filters/utils');
const { findFaces } = require('../utils/faces');
const getImageInfo = require('../utils/get-image-info');

class ValidatorFaceDetection {
  constructor({ gifThreshold = 0.5 } = {}) {
    this.gifThreshold = gifThreshold;
  }

  get name() {
    return 'face-detection';
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
        matchedFrames += 1;
      }
    });
    const numRequired = Math.floor(numFrames * this.gifThreshold);
    console.log(`🧐 Matched ${matchedFrames} (of required ${numRequired})`);
    return matchedFrames >= numRequired;
  }
}

module.exports = ValidatorFaceDetection;
