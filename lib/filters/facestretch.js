const { execCmd } = require('./utils');
const getBoundingBox = require('../utils/get-bounding-box');
const { maxBy, minBy, random } = require('lodash');

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
        ? `\\( +clone -crop ${w}x${h - endY}+0+${
            y + 1
          } -repage +0+${endY} \\) -flatten`
        : '';

    return `convert "${file}" ${rest} ${clones.join(' ')} "${file}"`;
  }

  getLargestFace(faces) {
    return maxBy(faces, ({ detection }) => {
      return detection.box.width * detection.box.height;
    });
  }

  getClosestFace(faces, lastFace) {
    return minBy(faces, ({ detection }) => {
      const { box: box1 } = detection;
      const { box: box2 } = lastFace.detection;
      return Math.hypot(box2.x - box1.x, box2.y - box1.y);
    });
  }

  getSuitableFace(faces, lastFace) {
    return lastFace
      ? this.getClosestFace(faces, lastFace)
      : this.getLargestFace(faces);
  }

  async applyFrame(frame, { numFrames, numFrame }) {
    const file = frame.file;
    const { width, height } = frame.getInfo();
    let lastFace;
    const faces = await frame.getFaces(this.avoidDescriptors);
    let face =
      faces.length === 0 ? lastFace : this.getSuitableFace(faces, lastFace);
    if (!face) {
      console.log('🙈 No faces, skipping this one');
      return;
    }
    if (this.isContinuous) {
      lastFace = face;
    }
    const progress = this.useProgress ? (numFrame + 1) / numFrames : 1;
    const box = getBoundingBox(face.landmarks.getMouth());
    execCmd(this.getCmd(file, width, height, box, progress));
  }
}

module.exports = FilterFaceGlow;
