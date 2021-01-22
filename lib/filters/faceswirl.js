const { execCmd, processAsStills } = require('./utils');
const { getFaces, getBoundingBox } = require('../utils/faces');

class FilterFaceSwirl {
  constructor({ rate = 50, avoidDescriptors = [] } = {}) {
    this.rate = rate;
    this.avoidDescriptors = avoidDescriptors;
  }

  get name() {
    return 'faceswirl';
  }

  getCmd(landmark, rate) {
    const { x, y, width, height } = getBoundingBox(landmark, 1);
    return `\\( +clone -crop "${width}x${height}+${x}+${y}" -swirl ${rate} \\) -geometry +${x}+${y}  -composite`;
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
        this.exec(png, this.getCmd(face.landmarks.getJawOutline(), this.rate));
      }
    });
  }
}

module.exports = FilterFaceSwirl;
