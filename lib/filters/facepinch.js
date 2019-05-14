const { execCmd, processAsStills } = require('./utils');
const { getFaces, getBoundingBox } = require('../utils/faces');

class FilterFacePinch {
  constructor({ rate = 0.5, avoidDescriptors = [] } = {}) {
    this.rate = rate;
    this.avoidDescriptors = avoidDescriptors;
  }

  get name() {
    return 'facepinch';
  }

  getCmd(landmark, rate) {
    const { x, y, width, height } = getBoundingBox(landmark, 1);
    return `\\( +clone -crop "${width}x${height}+${x}+${y}" -implode ${rate} \\) -geometry +${x}+${y}  -composite`;
  }

  exec(file, cmd) {
    execCmd(`convert "${file}" ${cmd} "${file}"`);
  }

  async apply(file) {
    await processAsStills(file, async png => {
      const faces = await getFaces(png, this.avoidDescriptors);
      if (faces.length === 0) {
        console.log('Skipping this one');
      }
      for (const face of faces) {
        this.exec(png, this.getCmd(face.landmarks.getMouth(), this.rate));
        this.exec(png, this.getCmd(face.landmarks.getLeftEye(), this.rate));
        this.exec(png, this.getCmd(face.landmarks.getRightEye(), this.rate));
      }
    });
  }
}

module.exports = FilterFacePinch;
