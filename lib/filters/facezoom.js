const { execCmd, processAsStills } = require('./utils');
const { first } = require('lodash');
const { findFaces } = require('../utils/faces');

class FilterFaceZoom {
  constructor({ startPosition = 0.5, lastFrameDelayMs } = {}) {
    this.startPosition = Math.max(Math.min(startPosition, 1), 0);
    this.lastFrameDelayMs = Number.isFinite(lastFrameDelayMs)
      ? lastFrameDelayMs
      : null;
  }

  get name() {
    return 'facezoom';
  }

  async getFaceCoordinates(file) {
    const faces = await findFaces(file);
    if (faces.length === 0) {
      return null;
    }
    const { x, y, width, height } = first(faces).detection.box;
    return {
      x: Math.floor(x),
      y: Math.floor(y),
      width: Math.floor(width),
      height: Math.floor(height)
    };
  }

  getFaceCoordinatesThatMatchImageAspect(face, imageWidth, imageHeight) {
    const { width, x } = face;
    const newWidth = Math.round((width * imageWidth) / imageHeight);
    const newX = Math.round(x - (newWidth - width) / 2);
    return { ...face, width: newWidth, x: newX };
  }

  async apply(file, getImageInfo) {
    const { width, height } = getImageInfo(file);

    let prev;

    await processAsStills(file, async (png) => {
      const face = (await this.getFaceCoordinates(png)) || prev;
      if (!face) {
        return;
      }
      prev = face;
      const coordinates = this.getFaceCoordinatesThatMatchImageAspect(
        face,
        width,
        height
      );
      const cmd = `-crop ${coordinates.width}x${coordinates.height}+${coordinates.x}+${coordinates.y} -resize ${width}x${height}! +repage`;
      execCmd(`convert "${png}" ${cmd} "${png}"`);
    });
  }
}

module.exports = FilterFaceZoom;
