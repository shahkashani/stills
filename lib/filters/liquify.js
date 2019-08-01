const { execCmd, processAsStills, getImageInfo } = require('./utils');

class FilterLiquify {
  constructor({ rate = 2, iterations = 1 } = {}) {
    this.rate = rate;
    this.iterations = iterations;
  }

  get name() {
    return 'liquify';
  }

  liquify(file, width, height, rate, iterations = 1) {
    const newWidth = width * rate;
    const newHeight = height * rate;
    for (var i = 0; i < iterations; i++) {
      console.log(`💧 Liquify iteration ${i + 1}/${iterations}...`);
      console.log(`🔺 Scaling up to ${newWidth}x${newHeight}`);
      const cmdUp = `mogrify -liquid-rescale "${newWidth}x${newHeight}!" "${file}"`;
      execCmd(cmdUp);
      console.log(`🔻 Scaling back down to ${width}x${height}`);
      const cmdDown = `mogrify -liquid-rescale "${width}x${height}!" "${file}"`;
      execCmd(cmdDown);
    }
  }

  async apply(file) {
    const { width, height } = getImageInfo(file);
    await processAsStills(file, async png => {
      this.liquify(png, width, height, this.rate, this.iterations);
    });
  }
}

module.exports = FilterLiquify;
