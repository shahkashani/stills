const getImageInfo = require('./get-image-info');
const fileToFrames = require('./file-to-frames');
const pixelmatch = require('pixelmatch');
const { map, range, sortBy, first } = require('lodash');

async function getSceneChanges(file, imageInfo, threshold = 0.1) {
  const image = await fileToFrames(file);
  const { width, height } = imageInfo;
  const result = [{ frame: 0, diff: 0 }];

  for (let frame = 1; frame < image.frames.length; frame++) {
    try {
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
    } catch (err) {
      console.error(err);
      result.push({
        frame,
        diff: 0
      });
    }
  }
  return sortBy(result, 'diff').reverse();
}

function getLastScene(order) {
  const numFrames = order.length;
  const numLateFrame = Math.ceil(numFrames - numFrames / 4);
  const lateChangesRemoved = order.filter((change) => change < numLateFrame);
  return [first(lateChangesRemoved), numFrames - 1];
}

function findChangeNear(order, point, offset = 4) {
  const intPoint = Math.floor(point);
  const start = Math.max(0, intPoint - offset);
  const end = Math.min(order.length - 1, intPoint + offset);
  const result = range(start, end + 1).map((frame) => ({
    frame,
    rank: order.indexOf(frame)
  }));
  return first(sortBy(result, 'rank')).frame;
}

async function getScenes(file) {
  const imageInfo = getImageInfo(file);
  const { numFrames } = imageInfo;
  if (numFrames < 2) {
    return null;
  }
  const changes = await getSceneChanges(file, imageInfo);
  const order = map(changes, 'frame');
  const midpoint = findChangeNear(order, numFrames / 2);
  const last = getLastScene(order);
  return {
    midpoint,
    last,
    changes,
    order
  };
}

module.exports = getScenes;
