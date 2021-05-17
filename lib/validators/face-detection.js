const { compact } = require('lodash');
const { getAsStills } = require('../filters/utils');
const { findFaces } = require('../utils/faces');

class ValidatorFaceDetection {
  constructor({ gifThreshold = 0.5 } = {}) {
    this.gifThreshold = gifThreshold;
  }

  get name() {
    return 'face-detection';
  }

  async validate(image) {
    const [files, deleteFiles] = getAsStills(image);
    const frames = files.length;
    const promises = files.map(async (file) => {
      const faces = await findFaces(file);
      return faces.length > 0;
    });

    const results = await Promise.all(promises);
    const matchedFrames = compact(results).length;
    const numRequired = frames > 1 ? Math.floor(frames * this.gifThreshold) : 1;

    console.log(`🧐 Matched ${matchedFrames} (of required ${numRequired})`);

    deleteFiles();

    return matchedFrames >= numRequired;
  }
}

module.exports = ValidatorFaceDetection;
