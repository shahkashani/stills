const { compact } = require('lodash');
const { getAsStills } = require('../filters/utils');
const { findFaces, getBoundingBox } = require('../utils/faces');

class ValidatorEyeDetection {
  constructor({ gifThreshold = 0.5, minEyeWidth = 10 } = {}) {
    this.gifThreshold = gifThreshold;
    this.minEyeWidth = minEyeWidth;
  }

  get name() {
    return 'eye-detection';
  }

  async validate(image) {
    const [files, deleteFiles] = getAsStills(image);
    const frames = files.length;
    const promises = files.map(async (file) => {
      const faces = await findFaces(file);
      if (faces.length > 0) {
        for (let face of faces) {
          const { width: left } = getBoundingBox(face.landmarks.getLeftEye());
          const { width: right } = getBoundingBox(face.landmarks.getRightEye());
          if (left >= this.minEyeWidth && right >= this.minEyeWidth) {
            return true;
          }
        }
      }
      return false;
    });

    const results = await Promise.all(promises);
    const matchedFrames = compact(results).length;
    const numRequired = frames > 1 ? Math.floor(frames * this.gifThreshold) : 1;

    console.log(`🧐 Matched ${matchedFrames} (of required ${numRequired})`);

    deleteFiles();

    return matchedFrames >= numRequired;
  }
}

module.exports = ValidatorEyeDetection;
