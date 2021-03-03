const { execCmd, processAsStills } = require('./utils');
const { getFaces, getBoundingBox } = require('../utils/faces');

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

  async apply(file) {
    await processAsStills(file, async (png) => {
      const faces = await getFaces(png, this.avoidDescriptors);
      if (faces.length === 0) {
        console.log('🙈 No faces, skipping this one');
      }
      const masks = faces.map((face) =>
        this.getCmd(png, face.landmarks.getJawOutline())
      );
      execCmd(`convert "${png}" ${masks.join(' ')} -flatten "${png}"`);
    });
  }
}

module.exports = FilterFaceGlow;
