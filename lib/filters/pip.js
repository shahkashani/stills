const { execCmd, getProgressiveCmd, getFrameRange } = require('./utils');

const easeInQuad = t => t * t * t;

class FilterPip {
  constructor({ degrees = 25, useProgress = true } = {}) {
    this.degrees = degrees;
    this.useProgress = useProgress;
  }

  get name() {
    return 'pip';
  }

  async apply(file, getImageInfo) {
    const { numFrames, width, height } = getImageInfo();
    const [start, end] = await getFrameRange(file);
    const rotation = getProgressiveCmd(
      start,
      end,
      numFrames,
      progress => {
        const pipSize = 1 + 4 * easeInQuad(progress);
        return `-resize ${width / pipSize}x${height / pipSize} -gravity center -background transparent -extent ${width}x${height}`;
      }
    );
    execCmd(`convert "${file}" ${rotation} "${file}"`);
  }
}

module.exports = FilterPip;
