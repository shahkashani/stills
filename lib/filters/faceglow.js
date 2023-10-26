const { execCmd } = require('./utils');
const getBoundingBox = require('../utils/get-bounding-box');

class FilterFaceGlow {
  constructor({ rate = '1000%', blur = 0.3, avoidDescriptors = [] } = {}) {
    this.rate = rate;
    this.blur = blur;
    this.avoidDescriptors = avoidDescriptors;
  }

  get name() {
    return 'faceglow';
  }

  getCmd(file, points) {
    const { width } = getBoundingBox(points);
    const blur = Math.ceil(width * this.blur);
    const polygon = points.map(({ x, y }) => `${x},${y}`).join(' ');
    const maskBlur = `0x${blur}`;
    const mask = `\\( +clone -threshold 100% -fill white -draw "polygon ${polygon}" -blur ${maskBlur} \\) -channel-fx '| gray=>alpha'`;
    return `\\( "${file}" ${mask} -modulate ${this.rate},0 -trim -alpha deactivate \\)`;
  }

  async applyFrame(frame) {
    const file = frame.file;
    const faces = await frame.getFaces(this.avoidDescriptors);
    if (faces.length === 0) {
      console.log('🙈 No faces, skipping this one');
    }
    const masks = faces.map((face) =>
      this.getCmd(file, face.landmarks.getJawOutline())
    );
    execCmd(`convert "${file}" ${masks.join(' ')} -flatten "${png}"`);
  }
}

module.exports = FilterFaceGlow;
