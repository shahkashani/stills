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
    const absoluteSize =
      this.size || `${width}x${height}${this.maintainAspectRatio ? '' : '!'}`;
    const size = this.sizePercent
      ? `${width * this.sizePercent}`
      : absoluteSize;

    console.log(`🛠 Using size ${size}...`);
    const cmd = `convert "${file}" -coalesce null: \\( "${this.overlayFile}" -resize ${size} \\) -gravity ${this.gravity} -layers composite -layers optimize "${file}"`;
    execCmd(cmd);
  }
}

module.exports = FilterOverlay;
