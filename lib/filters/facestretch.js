const { execCmd, processAsStills, getImageInfo } = require('./utils');
const { getFaces, getBoundingBox } = require('../utils/faces');
const { maxBy } = require('lodash');

class FilterFaceGlow {
  constructor({ rate = 0.2, avoidDescriptors = [], isContinuous = true } = {}) {
    this.avoidDescriptors = avoidDescriptors;
    this.rate = rate;
    this.isContinuous = isContinuous;
  }

  get name() {
    return 'facestretch';
  }

  getCmd(file, w, h, box) {
    const y = Math.floor(box.y + box.height / 2);
    const endY = Math.min(h, Math.floor(y + h * this.rate));
    const clones = [];

    for (let i = y; i < endY; i += 1) {
      clones.push(
        `\\( +clone -crop ${w}x1+0+${y} -repage +0+${i} \\) -flatten`
      );
    }

    const rest =
      endY < h
        ? `\\( +clone -crop ${w}x${h - endY}+0+${y +
            1} -repage +0+${endY} \\) -flatten`
        : '';

    return `convert "${file}" ${rest} ${clones.join(' ')} "${file}"`;
  }

  getLargestFace(faces) {
    return maxBy(faces, ({ detection }) => {
      return detection.box.width * detection.box.height;
    });
  }

  async apply(file) {
    const { width, height } = getImageInfo(file);
    let lastFace;

    await processAsStills(file, async png => {
      const faces = await getFaces(png, this.avoidDescriptors);
      let face = faces.length === 0 ? lastFace : this.getLargestFace(faces);
      if (!face) {
        console.log('🙈 No faces, skipping this one');
        return;
      }
      const box = getBoundingBox(face.landmarks.getMouth());
      execCmd(this.getCmd(png, width, height, box));
      if (this.isContinuous) {
        lastFace = face;
      }
    });
  }
}

module.exports = FilterFaceGlow;
