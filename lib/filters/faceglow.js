const { execCmd, processAsStills } = require('./utils');
const { getFaces, getBoundingBox } = require('../utils/faces');

class FilterFaceGlow {
  constructor({ rate = '1000%', avoidDescriptors = [] } = {}) {
    this.rate = rate;
    this.avoidDescriptors = avoidDescriptors;
  }

  get name() {
    return 'faceglow';
  }

  getCmd(file, points) {
    const { width } = getBoundingBox(points);
    const blur = Math.ceil(width * 0.3);
    const polygon = points.map(({ x, y }) => `${x},${y}`).join(' ');
    const maskBlur = `0x${blur}`;
    const mask = `\\( +clone -threshold 100% -fill white -draw "polygon ${polygon}" -blur ${maskBlur} \\) -channel-fx '| gray=>alpha'`;
    const globalEffect = `-modulate ${this.rate},0`;
    const maskEffect = ``;
    return `convert "${file}" \\( "${file}" ${mask} ${globalEffect} -trim -alpha off ${maskEffect} \\) -flatten "${file}"`;
  }

  async apply(file) {
    await processAsStills(file, async png => {
      const faces = await getFaces(png, this.avoidDescriptors);
      if (faces.length === 0) {
        console.log('🙈 No faces, skipping this one');
      }
      for (const face of faces) {
        execCmd(this.getCmd(png, face.landmarks.getJawOutline()));
      }
    });
  }
}

module.exports = FilterFaceGlow;
