const { execCmd } = require('./utils');
const getBoundingBox = require('../utils/get-bounding-box');

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

  async applyFrame(frame) {
    const file = frame.file;
    const faces = await frame.getFaces(this.avoidDescriptors);
    if (faces.length === 0) {
      console.log('Skipping this one');
    }
    for (const face of faces) {
      this.exec(file, this.getCmd(face.landmarks.getMouth(), this.rate));
      this.exec(file, this.getCmd(face.landmarks.getLeftEye(), this.rate));
      this.exec(file, this.getCmd(face.landmarks.getRightEye(), this.rate));
    }
  }
}

module.exports = FilterFacePinch;
