const { execCmd, processAsStills, getDrawCommand } = require('./utils');
const { getFaces, getBoundingBox } = require('../utils/faces');
const { max } = require('lodash');

class FilterFaceDemonize {
  constructor({ avoidDescriptors = [] } = {}) {
    this.avoidDescriptors = avoidDescriptors;
  }

  get name() {
    return 'facedemonize';
  }

  getOutlineCmd(file, points) {
    const { width } = getBoundingBox(points);
    const blur = Math.ceil(width * 0.1);
    const polygon = points.map(({ x, y }) => `${x},${y}`).join(' ');
    const maskBlur = `-blur 0x${blur}`;
    const mask = `\\( +clone -threshold 100% -fill white -draw "polygon ${polygon}" ${maskBlur} \\) -channel-fx '| gray=>alpha'`;
    const effect = `-modulate -1000%,0`;
    return `convert "${file}" \\( "${file}" ${mask} ${effect} -trim -alpha off \\) -flatten "${file}"`;
  }

  getFeaturesCmd(file, pointSets) {
    const widths = pointSets.map(pointSet => getBoundingBox(pointSet).width);
    const effects = `-blur 0x${max(widths) * 0.01}`;
    return getDrawCommand(file, pointSets, {
      effects,
      fill: 'red'
    });
  }

  async apply(file) {
    await processAsStills(file, async png => {
      const faces = await getFaces(png, this.avoidDescriptors);
      if (faces.length === 0) {
        console.log('🙈 No faces, skipping this one');
      }
      for (const face of faces) {
        execCmd(this.getOutlineCmd(png, face.landmarks.getJawOutline()));
        execCmd(
          this.getFeaturesCmd(png, [
            face.landmarks.getLeftEye(),
            face.landmarks.getRightEye(),
            face.landmarks.getLeftEyeBrow(),
            face.landmarks.getRightEyeBrow(),
            face.landmarks.getNose(),
            face.landmarks.getMouth()
          ])
        );
      }
    });
  }
}

module.exports = FilterFaceDemonize;
