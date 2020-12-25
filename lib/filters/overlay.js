const { execCmd } = require('./utils');

class FilterOverlay {
  constructor({
    overlayFile = null,
    gravity = 'center',
    size = null,
    sizePercent = null,
    maintainAspectRatio = true
  } = {}) {
    this.size = size;
    this.sizePercent = sizePercent;
    this.overlayFile = overlayFile;
    this.gravity = gravity;
    this.maintainAspectRatio = maintainAspectRatio;
  }

  get name() {
    return 'overlay';
  }

  async apply(file, getImageInfo) {
    const { width, height } = getImageInfo(file);
    console.log(width, height);
    const absoluteSize =
      this.size || `${width}x${height}${this.maintainAspectRatio ? '' : '!'}`;
    const size = this.sizePercent
      ? `${width * this.sizePercent}`
      : absoluteSize;

    console.log(`🛠 Using size ${size}...`);
    execCmd(`convert "${file}" -coalesce null: \\( "${this.overlayFile}" -resize ${size} \\) -gravity ${this.gravity} -layers composite -layers optimize -resize ${width}x${height}!  "${file}"`);
  }
}

module.exports = FilterOverlay;
