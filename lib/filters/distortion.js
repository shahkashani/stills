const { exec } = require('shelljs');
const { getImageInfo } = require('./utils');
const { range } = require('lodash');

class FilterDistortion {
  constructor({ heightFactor = 0.6, widthFactor = 0 } = {}) {
    this.heightFactor = Math.max(Math.min(heightFactor, 1), 0);
    this.widthFactor = Math.max(Math.min(widthFactor, 1), 0);
  }

  get name() {
    return 'distortion';
  }

  getStillTransformations(width, height) {
    const newWidth = Math.floor(width * (1 - this.widthFactor));
    const newHeight = Math.floor(height * (1 - this.heightFactor));
    return `\\( -clone 0 -gravity center -crop ${newWidth}x${newHeight}+0+0 -resize ${width}x${height}! +repage \\)`;
  }

  getFrameTransformations(frameCount, width, height) {
    const widthDelta = (this.widthFactor * width) / frameCount;
    const heightDelta = (this.heightFactor * height) / frameCount;

    return range(0, frameCount)
      .map(frame => {
        const newWidth = Math.floor(width - widthDelta * frame);
        const newHeight = Math.floor(height - heightDelta * frame);
        const transform = `-gravity center -crop ${newWidth}x${newHeight}+0+0 -resize ${width}x${height}! +repage`;
        return `\\( -clone ${frame} ${transform} \\)`;
      })
      .join(' ');
  }

  async apply(file) {
    const { frameCount, width, height } = getImageInfo(file);
    const frames =
      frameCount > 1
        ? this.getFrameTransformations(frameCount, width, height)
        : this.getStillTransformations(width, height);
    const lastFrame = frameCount - 1;
    const cmd = `convert "${file}" ${frames} -delete 0-${lastFrame} -coalesce "${file}"`;
    const result = exec(cmd);
    if (result.code !== 0) {
      console.log(`🐞 Oops: ${result.stderr}\n> ${cmd}`);
    }
  }
}

module.exports = FilterDistortion;
