const { exec } = require('shelljs');
const { getCropCommand } = require('./utils');
const { first, range } = require('lodash');
const { unlinkSync } = require('fs');
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
    const startAt = Math.floor(numFrames * this.startPosition);
    const numAnimFrames = numFrames - startAt;
    const deltaX = x / numAnimFrames;
    const deltaY = y / numAnimFrames;
    const deltaH = (imageHeight - height) / numAnimFrames;
    const deltaW = (imageWidth - width) / numAnimFrames;
    const imageRatio = imageWidth / imageHeight;

    return range(0, numAnimFrames).map(index => {
      const currHeight = Math.floor(imageHeight - deltaH * index);
      const currRawWidth = Math.floor(imageWidth - deltaW * index);
      const currWidth = Math.floor(currHeight * imageRatio);
      const currOffsetX = (currWidth - currRawWidth) / 2;
      const currX = Math.floor(deltaX * index) - currOffsetX;
      const currY = Math.floor(deltaY * index);
      const delay =
        this.lastFrameDelayMs && index === numAnimFrames - 1
          ? Math.round(this.lastFrameDelayMs / 10)
          : null;

      return {
        delay,
        index: index + startAt,
        x: currX,
        y: currY,
        width: currWidth,
        height: currHeight
      };
    });
  }

  async apply(file, imageInfo) {
    const { numFrames, width, height } = imageInfo;

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
