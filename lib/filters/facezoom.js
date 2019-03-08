const { exec } = require('shelljs');
const { getImageInfo, getCropCommand } = require('./utils');
const { first, range } = require('lodash');
const { unlinkSync } = require('fs');
const { findFaces } = require('../utils/faces');

class FilterFaceZoom {
  constructor({ startPosition = 0.5 } = {}) {
    this.startPosition = Math.max(Math.min(startPosition, 1), 0);
  }

  get name() {
    return 'facezoom';
  }

  getStill(file, num) {
    const still = `${file}.png`;
    const cmd = `convert "${file}[${num}]" "${still}"`;
    const result = exec(cmd, { silence: true });
    if (result.code !== 0) {
      console.log(`🐞 Oops: ${result.stderr}\n> ${cmd}`);
    }
    return still;
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

  getInstructions(imageWidth, imageHeight, face, numFrames) {
    const { x, y, width, height } = face;
    const deltaX = x / numFrames;
    const deltaY = y / numFrames;
    const deltaH = (imageHeight - height) / numFrames;
    const deltaW = (imageWidth - width) / numFrames;
    const imageRatio = imageWidth / imageHeight;

    const startAt = Math.floor(numFrames * this.startPosition);

    return range(startAt, numFrames).map(index => {
      const currHeight = Math.floor(imageHeight - deltaH * index);
      const currRawWidth = Math.floor(imageWidth - deltaW * index);
      const currWidth = Math.floor(currHeight * imageRatio);
      const currOffsetX = (currWidth - currRawWidth) / 2;
      const currX = Math.floor(deltaX * index) - currOffsetX;
      const currY = Math.floor(deltaY * index);

      return {
        index,
        x: currX,
        y: currY,
        width: currWidth,
        height: currHeight
      };
    });
  }

  async apply(file) {
    const { numFrames, width, height } = getImageInfo(file);

    if (numFrames < 2) {
      console.log(`🤷 Can't work with stills`);
      return;
    }

    const tempStillFrame = this.getStill(file, numFrames - 1);
    const face = await this.getFaceCoordinates(tempStillFrame);
    unlinkSync(tempStillFrame);

    if (!face) {
      console.log(`🤷 No faces detected in this one`);
      return;
    }

    const adjustedFace = this.getFaceCoordinatesThatMatchImageAspect(
      face,
      width,
      height
    );

    const instructions = this.getInstructions(
      width,
      height,
      adjustedFace,
      numFrames
    );

    const cmd = getCropCommand(file, width, height, instructions);
    const result = exec(cmd, { silent: true });

    if (result.code !== 0) {
      console.log(`🐞 Oops: ${result.stderr}\n> ${cmd}`);
    }
  }
}

module.exports = FilterFaceZoom;
