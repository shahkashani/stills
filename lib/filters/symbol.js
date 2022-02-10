const { exec } = require('../effects');
const getImageInfo = require('../utils/get-image-info');

class FilterSymbol {
  constructor({
    symbol,
    startEnd = false,
    numFrames = 2,
    filter,
    filterOpacity = 20,
    symbolOpacity = 40,
    symbolRatioSize = 0.5,
    symbolSize = null,
    symbolGravity = 'southeast',
    symbolGeometry = '+10+10',
    isTrace = false,
    fillColor = 'white',
    defaultSymbol = null,
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
    this.defaultSymbol = defaultSymbol;
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
    const opacity = this.filter
      ? factor * (100 - this.filterOpacity)
      : factor * 100;
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

  async applySymbol(symbol, frame, image, opacity) {
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
    const useBorder = border
      ? `-bordercolor "${borderColor}" -border ${border}`
      : '';
    exec(
      frame,
      `-coalesce NULL: \\( "${symbol}" -resize ${size} ${grayscale} ${negate} ${useBorder} -matte -channel A +level 0,${opacity}% \\) -gravity ${this.symbolGravity} -geometry ${this.symbolGeometry} -layers composite`
    );
  }

  async applyFrame(frame, { image, numFrame, numFrames }) {
    const result = await this.getOpacity(image, numFrame, numFrames);
    if (this.symbol && result && result.isLast) {
      await this.applySymbol(this.symbol, frame, image, 100);
    } else if (this.defaultSymbol) {
      await this.applySymbol(this.defaultSymbol, frame, image, 100);
    }
    if (result) {
      const { opacity, isLast } = result;
      if (isLast) {
        if (this.filter) {
          await this.applyFilter(this.filter, frame, image);
        } else {
          await exec(frame, `-fill ${this.fillColor} -colorize ${opacity}`);
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
