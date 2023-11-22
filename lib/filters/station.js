const { trails } = require('../effects');
const { maxBy, round, min, max, sortBy } = require('lodash');

const roundNearest = (num, nearest) => {
  return Math.round(num / nearest) * nearest;
};

class FilterStation {
  get name() {
    return 'station';
  }

  async setup({ image }) {
    const frames = image.getFrames();
    const results = [];
    for (const frame of frames) {
      const faces = await frame.getFaces();

      if (faces.length === 0) {
        continue;
      }
      const size = max(faces.map((face) => face.size[1]));
      const angle = min(faces.map((face) => Math.abs(face.rotation.angle.yaw)));

      const { boxScore } = maxBy(faces, 'boxScore');
      results.push({
        index: frame.index,
        count: faces.length,
        score: round(boxScore, 1),
        size: roundNearest(size, 10),
        angle: round(angle, 2)
      });
    }
    if (results.length === 0) {
      return;
    }
    const sorted = sortBy(
      results,
      (r) => -r.count,
      (r) => -r.angle,
      'size',
      'score'
    ).reverse();
    console.log('💅 All results', sorted);
    const best = sorted[0];
    console.log('💅 The best station frame is', best);
    this.bestFrame = frames.find((frame) => frame.index === best.index);
  }

  async applyFrame(frame) {
    if (!this.bestFrame) {
      return;
    }
    const overlayBuffer = this.bestFrame.buffer;
    frame.buffer = await trails(frame.buffer, { overlayBuffer });
  }

  async teardown() {
    delete this.bestFrame;
  }
}

module.exports = FilterStation;
