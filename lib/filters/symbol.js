const Arcadia = require('../filters/arcadia');
const { exec } = require('../effects');

class FilterSymbol {
  constructor({
    symbol,
    startEnd = false,
    numFrames = 3,
    filter,
    filterOpacity = 20
  } = {}) {
    this.symbol = symbol;
    this.filter = filter;
    this.filterOpacity = filterOpacity;
    this.numFrames = numFrames;
    this.startEnd = startEnd;
  }

  get name() {
    return 'symbol';
  }

  async getOpacity(image, numFrame, numFrames) {
    let startFrame = numFrames - this.numFrames;

    if (!this.startEnd) {
      const {
        midpoint,
        last: [point]
      } = await image.getScenes();
      const usePoint = point < this.numFrames ? midpoint : point;
      startFrame = usePoint - this.numFrames;
    }

    const endFrame = startFrame + this.numFrames;
    if (numFrame < startFrame || numFrame >= endFrame) {
      return null;
    }
    const current = this.numFrames - (endFrame - numFrame) + 1;
    return (100 * current) / this.numFrames;
  }

  async applyFrame(frame, { image, numFrame, numFrames }) {
    const opacity = await this.getOpacity(image, numFrame, numFrames);
    if (opacity) {
      if (opacity === 100) {
        if (this.filter) {
          const cloned = frame.clone();
          await this.filter.applyFrame(cloned, { image });
          await exec(
            frame,
            `-coalesce NULL: \\( "${cloned.file}" \\( +clone -canny 0x1+5%+10% -matte -channel A +level 0,20% \\) -composite -fill white -colorize ${
              100 - this.filterOpacity
            } \\) -define compose:args=${opacity}x100 -compose dissolve -layers composite`
          );
          cloned.delete();
        } else {
          await exec(frame, `-fill white -colorize 90`);
        }
      } else {
        await exec(frame, `-fill white -colorize ${opacity}`);
      }
    }
  }
}

module.exports = FilterSymbol;
