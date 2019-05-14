const { execCmd, processAsStills, getImageInfo } = require('./utils');
const { getFaces } = require('../utils/faces');

class FilterFaceOrb {
  constructor({
    radius = 0.4,
    offset = 1.1,
    fill = 'white',
    avoidDescriptors = []
  } = {}) {
    this.avoidDescriptors = avoidDescriptors;
    this.radius = radius;
    this.fill = fill;
    this.offset = offset;
  }

  get name() {
    return 'faceorb';
  }

  getCmd(file, box) {
    const fill = this.fill;
    const { x: x, y: y, width, height } = box.toSquare();
    const offset = height * this.offset;
    const radius = width * this.radius;
    const blur = radius * 0.4;
    const x0 = x + width / 2;
    const y0 = y + height / 2 - offset;
    const x1 = x0 + radius;
    const { width: sizew, height: sizeh } = getImageInfo(file);
    return `convert "${file}" \\( -size ${sizew}x${sizeh} xc:transparent -fill ${fill} -draw "circle ${x0},${y0} ${x1},${y0}" -blur 0x${blur} \\) -composite "${file}"`;
  }

  async apply(file) {
    await processAsStills(file, async png => {
      const faces = await getFaces(png, this.avoidDescriptors);
      if (faces.length === 0) {
        console.log('🙈 No faces, skipping this one');
      }
      for (const face of faces) {
        execCmd(this.getCmd(png, face.detection.box));
      }
    });
  }
}

module.exports = FilterFaceOrb;
