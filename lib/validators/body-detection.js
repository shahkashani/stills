const { getBodyMap } = require('../utils/faces');
const validateFrames = require('./utils/validate-frames');

class ValidatorBodyDetection {
  constructor({ gifThreshold = 0.8 } = {}) {
    this.gifThreshold = gifThreshold;
  }

  get name() {
    return 'body-detection';
  }

  async validate(image) {
    return await validateFrames({
      image,
      gifThreshold: this.gifThreshold,
      validationFn: async (file) => {
        const segmentation = await getBodyMap(file, 0.5, [], 'low', 1);
        return !!segmentation;
      }
    });
  }
}

module.exports = ValidatorBodyDetection;
