const { execCmd } = require('./utils');

class FilterOverlay {
  constructor({
    overlayFile = null,
    gravity = 'center',
    size = null,
    sizePercentWidth = null,
    sizePercentHeight = null,
    maintainAspectRatio = true,
    opacity = 100
  } = {}) {
    this.opacity = opacity;
    this.size = size;
    this.sizePercentWidth = sizePercentWidth;
    this.sizePercentHeight = sizePercentHeight;
    this.overlayFile = overlayFile;
    this.gravity = gravity;
    this.maintainAspectRatio = maintainAspectRatio;
  }

  get name() {
    return 'overlay';
  }

  getSize(width, height) {
    if (this.size) {
      return this.size;
    }
    if (this.sizePercentWidth) {
      return `${Math.round(width * this.sizePercentWidth)}x`;
    }
    if (this.sizePercentHeight) {
      return `x${Math.round(height * this.sizePercentHeight)}`;
    }
    return `${width}x${height}${this.maintainAspectRatio ? '' : '!'}`;
  }

  getOpacity() {
    if (this.opacity === 100) {
      return '';
    }
    return `-matte -channel A +level 0,${this.opacity}%`;
  }

  async apply(file, getImageInfo) {
    const { width, height } = getImageInfo(file);
    const opacity = this.getOpacity();
    const size = this.getSize(width, height);

    console.log(`🛠  Using size ${size}...`);
    execCmd(
      `convert "${file}" -coalesce null: \\( "${this.overlayFile}" -resize ${size} ${opacity} \\) -gravity ${this.gravity} -layers composite "${file}"`
    );
  }
}

module.exports = FilterOverlay;
