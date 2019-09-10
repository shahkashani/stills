const { execCmd, processAsStills } = require('./utils');

class FilterLiquify {
  constructor({
    rate = null,
    rateWidth = 2,
    rateHeight = 2,
    iterations = 1,
    useProgress = false
  } = {}) {
    if (rate) {
      this.rateWidth = rate;
      this.rateHeight = rate;
    } else {
      this.rateWidth = rateWidth;
      this.rateHeight = rateHeight;
    }
    this.iterations = iterations;
    this.useProgress = useProgress;
  }

  get name() {
    return 'liquify';
  }

  liquify(file, width, height, rateWidth, rateHeight, iterations = 1) {
    const newWidth = Math.round(width * rateWidth);
    const newHeight = Math.round(height * rateHeight);
    for (var i = 0; i < iterations; i++) {
      console.log(
        `💧 Liquify iteration ${i +
          1}/${iterations} (@${rateWidth} @${rateHeight})...`
      );
      console.log(`🔺 Scaling up to ${newWidth}x${newHeight}`);
      const cmdUp = `mogrify -liquid-rescale "${newWidth}x${newHeight}!" "${file}"`;
      execCmd(cmdUp);
      console.log(`🔻 Scaling back down to ${width}x${height}`);
      const cmdDown = `mogrify -liquid-rescale "${width}x${height}!" "${file}"`;
      execCmd(cmdDown);
    }
  }

  async apply(file, getImageInfo) {
    const { width, height } = getImageInfo();
    await processAsStills(file, async (png, numProgress) => {
      this.liquify(
        png,
        width,
        height,
        this.useProgress
          ? 1 + numProgress * (this.rateWidth - 1)
          : this.rateWidth,
        this.useProgress
          ? 1 + numProgress * (this.rateHeight - 1)
          : this.rateHeight,
        this.iterations
      );
    });
  }
}

module.exports = FilterLiquify;
