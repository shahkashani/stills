const { execCmd, processAsStills, getDrawCommand } = require('./utils');
const { getFaces, getBoundingBox } = require('../utils/faces');
const { max } = require('lodash');

class FilterFaceDemonEyes {
  constructor({ fill = 'red', blur = 0.2, avoidDescriptors = [] } = {}) {
    this.avoidDescriptors = avoidDescriptors;
    this.fill = fill;
    this.blur = blur;
  }

  get name() {
    return 'facedemoneyes';
  }

  getFeaturesCmd(file, pointSets) {
    const widths = pointSets.map(pointSet => getBoundingBox(pointSet).width);
    const effects = `-blur 0x${max(widths) * this.blur}`;
    return getDrawCommand(file, pointSets, {
      effects,
      fill: this.fill
    });
  }

  async apply(file) {
    await processAsStills(file, async png => {
      const faces = await getFaces(png, this.avoidDescriptors);
      if (faces.length === 0) {
        console.log('🙈 No faces, skipping this one');
      }
      for (const face of faces) {
        execCmd(
          this.getFeaturesCmd(png, [
            face.landmarks.getLeftEye(),
            face.landmarks.getRightEye()
          ])
        );
      }
    });
  }
}

module.exports = FilterFaceDemonEyes;
