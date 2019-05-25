const { execCmd, processAsStills, getImageInfo } = require('./utils');
const { getFaces, getBoundingBox } = require('../utils/faces');
const { maxBy, random } = require('lodash');

class FilterFaceGlow {
  constructor({
    rate = 0.2,
    randomOffset = 0,
    avoidDescriptors = [],
    useProgress = true,
    isContinuous = true
  } = {}) {
    this.avoidDescriptors = avoidDescriptors;
    this.randomOffset = randomOffset;
    this.rate = rate;
    this.useProgress = useProgress;
    this.isContinuous = isContinuous;
  }

  get name() {
    return 'facestretch';
  }

  getCmd(file, w, h, box, factor = 1) {
    const y = Math.floor(box.y + box.height / 2);
    const endY = Math.min(h, Math.floor(y + h * this.rate * factor));
    const clones = [];

    for (let i = y; i < endY; i += 1) {
      const x = random(-this.randomOffset, this.randomOffset);
      clones.push(
        `\\( +clone -crop ${w}x1+0+${y} -repage +${x}+${i} \\) -flatten`
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
    const { width, height, numFrames } = getImageInfo(file);
    let lastFace;
    let i = 0;

    await processAsStills(file, async png => {
      const faces = await getFaces(png, this.avoidDescriptors);
      let face = faces.length === 0 ? lastFace : this.getLargestFace(faces);
      if (!face) {
        console.log('🙈 No faces, skipping this one');
        return;
      }
      const progress = this.useProgress ? (i + 1) / numFrames : 1;
      const box = getBoundingBox(face.landmarks.getMouth());
      execCmd(this.getCmd(png, width, height, box, progress));
      if (this.isContinuous) {
        lastFace = face;
      }
      i++;
    });
  }
}

module.exports = FilterFaceGlow;
