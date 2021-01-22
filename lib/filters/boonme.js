const { execCmd, processAsStills, getRawDrawCommand } = require('./utils');
const { getFaces, getBoundingBox, fillFaces } = require('../utils/faces');

class FilterBoonme {
  constructor({ avoidDescriptors = [], fill = 'white' } = {}) {
    this.avoidDescriptors = avoidDescriptors;
    this.fill = fill;
  }

  get name() {
    return 'boonme';
  }

  getOutlineCmd(file, points, rotation = 0) {
    const { width, x, y } = getBoundingBox(points);
    const rotationCmd =
      rotation > 0
        ? `-distort ScaleRotateTranslate '${x + width / 2},${y} 1 ${rotation}'`
        : '';
    const blur = Math.ceil(width * 0.1);
    const polygon = points.map(({ x, y }) => `${x},${y}`).join(' ');
    const maskBlur = `-blur 0x${blur}`;
    const mask = `\\( +clone -threshold 100% -fill white -draw "polygon ${polygon}" ${maskBlur} ${rotationCmd} \\) -channel-fx '| gray=>alpha'`;
    const effect = `-modulate -1000%,0`;
    return `convert "${file}" \\( "${file}" ${mask} ${effect} -trim -alpha off \\) -flatten "${file}"`;
  }

  getFeaturesCmd(file, pointSet, size) {
    const { x, y } = getBoundingBox(pointSet);
    const startX = x + size / 2;
    const startY = y + size / 2;
    return getRawDrawCommand(
      file,
      `-draw 'circle ${startX},${startY} ${startX},${startY + size}'`,
      {
        fill: this.fill
      }
    );
  }

  async apply(file) {
    let facesPerFrames = {};
    await processAsStills(
      file,
      async (png, _p, index) => {
        const faces = facesPerFrames[index];
        if (faces.length === 0) {
          console.log('🙈 No faces, skipping this one');
        }
        for (const face of faces) {
          const jaw = face.landmarks.getJawOutline();
          execCmd(this.getOutlineCmd(png, jaw));
          execCmd(this.getOutlineCmd(png, jaw, 180));
          const bounds = getBoundingBox(face.landmarks.getLeftEye());
          const size = Math.min(bounds.width, bounds.height);
          execCmd(this.getFeaturesCmd(png, face.landmarks.getLeftEye(), size));
          execCmd(this.getFeaturesCmd(png, face.landmarks.getRightEye(), size));
        }
      },
      async (png, progress, index) => {
        const faces = await getFaces(png, this.avoidDescriptors);
        facesPerFrames[index] = faces;
        if (progress === 1) {
          //facesPerFrames = fillFaces(facesPerFrames);
        }
      }
    );
  }
}

module.exports = FilterBoonme;
