const { execCmd, getImageInfo } = require('./utils');
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
    const { numFrames } = getImageInfo(file);

    if (numFrames > 1) {
      console.log(`🤷 Can only work with stills right now`);
      return;
    }

    const faces = await getFaces(file, this.avoidDescriptors);

    if (faces.length === 0) {
      console.log(`🤷 No faces detected`);
      return;
    }

    console.log(`🤩 Found ${faces.length} face${faces.length > 1 ? 's' : ''}`);

    faces.forEach(face => {
      this.exec(file, this.getCmd(face.landmarks.getMouth(), this.rate));
      this.exec(file, this.getCmd(face.landmarks.getLeftEye(), this.rate));
      this.exec(file, this.getCmd(face.landmarks.getRightEye(), this.rate));
    });
  }
}

module.exports = FilterFacePinch;
