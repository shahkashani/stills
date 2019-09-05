const pixelmatch = require('pixelmatch');
const { sortBy, map, range, first } = require('lodash');
const { fileToFrames } = require('../utils');

class GlobalsScenes {
  get name() {
    return 'scenes';
  }

  async getSceneChanges(file, imageInfo, threshold = 0.1) {
    const image = await fileToFrames(file);
    const { width, height } = imageInfo;
    const result = [{ frame: 0, diff: 0 }];
    for (let frame = 1; frame < image.frames.length; frame++) {
      result.push({
        frame,
        diff: pixelmatch(
          image.frames[frame - 1].data,
          image.frames[frame].data,
          null,
          width,
          height,
          { threshold }
        )
      });
    }
    return sortBy(result, 'diff').reverse();
  }

  getLastScene(order) {
    const numFrames = order.length;
    const numLateFrame = Math.ceil(numFrames - numFrames / 4);
    const lateChangesRemoved = order.filter(change => change < numLateFrame);
    return [first(lateChangesRemoved), numFrames - 1];
  }

  findChangeNear(order, point, offset = 4) {
    const intPoint = Math.floor(point);
    const start = Math.max(0, intPoint - offset);
    const end = Math.min(order.length - 1, intPoint + offset);
    const result = range(start, end + 1).map(frame => ({
      frame,
      rank: order.indexOf(frame)
    }));
    return first(sortBy(result, 'rank')).frame;
  }

  async get(file, imageInfo) {
    const { numFrames } = imageInfo;
    if (numFrames < 2) {
      return null;
    }
    const changes = await this.getSceneChanges(file, imageInfo);
    const order = map(changes, 'frame');
    const midpoint = this.findChangeNear(order, numFrames / 2);
    const last = this.getLastScene(order);
    return {
      midpoint,
      last,
      changes,
      order
    };
  }
}

module.exports = GlobalsScenes;
