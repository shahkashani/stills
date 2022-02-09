const { exec } = require('../effects');
const getImageInfo = require('../utils/get-image-info');

class FilterSymbol {
  constructor({
    symbol,
    startEnd = false,
    numFrames = 3,
    filter,
    filterOpacity = 20,
    symbolOpacity = 20,
    symbolRatioSize = 1,
    symbolSize = null,
    symbolGravity = 'east',
    symbolGeometry = '+0+0',
    isTrace = false,
    fillColor = 'white',
    symbolEffects = {
      grayscale: false,
      negate: false,
      backdrop: false,
      border: 0,
      borderColor: 'white'
    }
  } = {}) {
    this.symbol = symbol;
    this.symbolOpacity = symbolOpacity;
    this.symbolSize = symbolSize;
    this.symbolRatioSize = symbolRatioSize;
    this.symbolEffects = symbolEffects;
    this.symbolGravity = symbolGravity;
    this.symbolGeometry = symbolGeometry;
    this.filter = filter;
    this.fillColor = fillColor;
    this.filterOpacity = filterOpacity;
    this.numFrames = numFrames;
    this.startEnd = startEnd;
    this.isTrace = isTrace;
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
    const step = this.numFrames - (endFrame - numFrame) + 1;
    const factor = step / this.numFrames;
    const opacity = factor * (100 - this.filterOpacity);
    const isLast = step === this.numFrames;
    const isFirst = step === 1;

    return { opacity, isLast, isFirst };
  }

  async applyFilter(filter, frame, image) {
    const cloned = frame.clone();
    const trace = this.isTrace
      ? `\\( +clone -canny 0x1+5%+10% -matte -channel A +level 0,20% \\)`
      : '\\( +clone \\)';
    await filter.applyFrame(cloned, { image });
    await exec(
      frame,
      `-coalesce NULL: \\( "${cloned.file}" ${trace} -composite -fill ${
        this.fillColor
      } -colorize ${
        100 - this.filterOpacity
      } \\) -define compose:args=100x100 -compose dissolve -layers composite`
    );
    cloned.delete();
  }

  async applySymbol(symbol, frame, image) {
    const { width: symbolWidth, height: symbolHeight } = getImageInfo(symbol);
    const { width, height } = image.getInfo();
    const effects = this.symbolEffects || {};
    const size =
      this.symbolSize ||
      (symbolWidth > symbolHeight
        ? `${width * this.symbolRatioSize}x`
        : `x${height * this.symbolRatioSize}`);

    const grayscale = effects.grayscale ? `-modulate 100,0` : '';
    const negate = effects.negate ? '-negate' : '';
    const border = effects.border || 0;
    const borderColor = effects.borderColor || 'white';
    if (effects.backdrop) {
      exec(
        frame,
        `-coalesce NULL: \\( "${symbol}" -resize ${size} -fill ${this.fillColor} -colorize 100 -bordercolor "${this.fillColor}" -border ${border} \\) -gravity ${this.symbolGravity} -geometry ${this.symbolGeometry} -layers composite`
      );
    }
    exec(
      frame,
      `-coalesce NULL: \\( "${symbol}" -resize ${size} ${grayscale} ${negate} -bordercolor "${borderColor}" -border ${border} -matte -channel A +level 0,${this.symbolOpacity}% \\) -gravity ${this.symbolGravity} -geometry ${this.symbolGeometry} -layers composite`
    );
  }

  async applyFrame(frame, { image, numFrame, numFrames }) {
    const result = await this.getOpacity(image, numFrame, numFrames);
    if (result) {
      const { opacity, isLast } = result;
      if (isLast) {
        if (this.filter) {
          await this.applyFilter(this.filter, frame, image);
        } else {
          await exec(frame, `-fill ${this.fillColor} -colorize 90`);
        }
        if (this.symbol) {
          await this.applySymbol(this.symbol, frame, image, this.symbolOpacity);
        }
      } else {
        await exec(frame, `-fill ${this.fillColor} -colorize ${opacity}`);
      }
    }
  }
}

module.exports = FilterSymbol;
