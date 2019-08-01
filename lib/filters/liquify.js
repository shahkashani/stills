const { execCmd, processAsStills, getImageInfo } = require('./utils');

class FilterLiquify {
  constructor({ rate = 2, iterations = 1, useProgress = false } = {}) {
    this.rate = rate;
    this.iterations = iterations;
    this.useProgress = useProgress;
  }

  get name() {
    return 'liquify';
  }

  liquify(file, width, height, rate, iterations = 1) {
    const newWidth = Math.round(width * rate);
    const newHeight = Math.round(height * rate);
    for (var i = 0; i < iterations; i++) {
      console.log(`💧 Liquify iteration ${i + 1}/${iterations} (@${rate})...`);
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
    await processAsStills(file, async (png, numProgress) => {
      this.liquify(
        png,
        width,
        height,
        this.useProgress ? 1 + numProgress * (this.rate - 1) : this.rate,
        this.iterations
      );
    });
  }
}

module.exports = FilterLiquify;
