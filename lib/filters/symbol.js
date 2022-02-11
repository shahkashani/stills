const { exec } = require('../effects');
const getImageInfo = require('../utils/get-image-info');

class FilterSymbol {
  constructor({
    symbol,
    startEnd = false,
    numFrames = 3,
    filter,
    filterOpacity = 5,
    symbolOpacity = 20,
    symbolHeight = 0.9,
    endOpacity = 90,
    symbolGravity = 'south',
    symbolGeometry = '+0+0',
    isTrace = false,
    fillColor = 'white',
    useBackdrop = true
  } = {}) {
    this.symbol = symbol;
    this.filter = filter;
    this.symbolOpacity = symbolOpacity;
    this.symbolHeight = symbolHeight;
    this.symbolGravity = symbolGravity;
    this.symbolGeometry = symbolGeometry;
    this.useBackdrop = useBackdrop;
    this.fillColor = fillColor;
    this.filterOpacity = filterOpacity;
    this.numFrames = numFrames;
    this.startEnd = startEnd;
    this.isTrace = isTrace;
    this.endOpacity = endOpacity;
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
    const offset = this.numFrames - (endFrame - numFrame) + 1;
    const factor = offset / this.numFrames;
    const opacity = factor * this.endOpacity;
    const endOffset = this.numFrames - offset;
    return { opacity, endOffset, offset };
  }

  async applyFilter(filter, frame, image, bgOpacity, filterOpacity = 100) {
    const cloned = frame.clone();
    const trace = this.isTrace
      ? `\\( +clone -canny 0x1+5%+10% -matte -channel A +level 0,20% \\)`
      : '\\( +clone \\)';
    await filter.applyFrame(cloned, { image });
    await exec(
      frame,
      `-coalesce NULL: \\( "${cloned.file}" ${trace} -composite -fill ${this.fillColor} -colorize ${bgOpacity} \\) -define compose:args=${filterOpacity}x100 -compose dissolve -layers composite`
    );
    cloned.delete();
  }

  async applySymbol(symbol, frame, image) {
    const { height } = image.getInfo();
    const size = `x${height * this.symbolHeight}`;

    if (this.useBackdrop) {
      exec(
        frame,
        `-coalesce NULL: \\( "${symbol}" -resize ${size} -fill ${this.fillColor} -colorize 100 \\) -gravity ${this.symbolGravity} -geometry ${this.symbolGeometry} -layers composite`
      );
    }
    exec(
      frame,
      `-coalesce NULL: \\( "${symbol}" -resize ${size} -matte -channel A +level 0,${this.symbolOpacity}% \\) -gravity ${this.symbolGravity} -geometry ${this.symbolGeometry} -layers composite`
    );
  }

  async applyFrame(frame, { image, numFrame, numFrames }) {
    const result = await this.getOpacity(image, numFrame, numFrames);
    if (result) {
      const { opacity, endOffset } = result;
      await exec(frame, `-fill ${this.fillColor} -colorize ${opacity}`);
      if (endOffset === 0) {
        if (this.filter) {
          await this.applyFilter(this.filter, frame, image, opacity);
        }
        if (this.symbol) {
          await this.applySymbol(this.symbol, frame, image);
        }
      }
    }
  }
}

module.exports = FilterSymbol;
