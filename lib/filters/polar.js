const { execCmd, getProgressiveCmd } = require("./utils");
const { random } = require("lodash");

class FilterPolar {
  constructor({ rate = random(45, 180), useSwirl = Math.random() > 0.5 } = {}) {
    this.rate = rate;
    this.useSwirl = useSwirl;
  }

  get name() {
    return "polar";
  }

  async apply(file, getImageInfo) {
    const { numFrames, width, height } = getImageInfo(file);
    const cmd = getProgressiveCmd(0, numFrames - 1, numFrames, progress => {
      return `-rotate 180 -virtual-pixel HorizontalTile -background black +distort Polar 0 -rotate ${180 *
        progress} +repage -rotate 180 -gravity center -extent ${width}x${height} -swirl ${90 *
        progress}`;
    });
    execCmd(`convert "${file}" ${cmd} "${file}"`);
  }
}

module.exports = FilterPolar;
