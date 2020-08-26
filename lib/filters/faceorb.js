const { execCmd, processAsStills } = require('./utils');
const { getFaces } = require('../utils/faces');

class FilterFaceOrb {
  constructor({ orbs = [], offset = 1.1, avoidDescriptors = [] } = {}) {
    this.avoidDescriptors = avoidDescriptors;
    this.orbs = orbs;
    this.offset = offset;
  }

  get name() {
    return 'faceorb';
  }

  getCmd(file, imageInfo, box, radiusRatio, blurRatio, fill) {
    const { x: x, y: y, width, height } = box.toSquare();
    const offset = height * this.offset;
    const radius = width * radiusRatio;
    const blur = radius * blurRatio;
    const x0 = x + width / 2;
    const y0 = y + height / 2 - offset;
    const x1 = x0 + radius;
    const { width: sizew, height: sizeh } = imageInfo;
    return `convert "${file}" \\( -size ${sizew}x${sizeh} xc:transparent -fill "${fill}" -draw "circle ${x0},${y0} ${x1},${y0}" -blur 0x${blur} \\) -composite "${file}"`;
  }

  async apply(file, getImageInfo) {
    const imageInfo = getImageInfo(file);
    await processAsStills(file, async png => {
      const faces = await getFaces(png, this.avoidDescriptors);
      if (faces.length === 0) {
        console.log('🙈 No faces, skipping this one');
      }
      for (const face of faces) {
        this.orbs.forEach(({ radius, color, blur }) => {
          execCmd(
            this.getCmd(png, imageInfo, face.detection.box, radius, blur, color)
          );
        });
      }
    });
  }
}

module.exports = FilterFaceOrb;
