const { execCmd } = require('./utils');

class FilterOverlay {
  constructor({
    overlayFile = null,
    gravity = 'center',
    size = null,
    sizePercentWidth = null,
    sizePercentHeight = null,
    maintainAspectRatio = true
  } = {}) {
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

  async apply(file, getImageInfo) {
    const { width, height } = getImageInfo(file);

    let size =
      this.size || `${width}x${height}${this.maintainAspectRatio ? '' : '!'}`;

    if (this.sizePercentWidth) {
      size = `${Math.round(width * this.sizePercentWidth)}x`;
    } else if (this.sizePercentHeight) {
      size = `x${Math.round(height * this.sizePercentHeight)}`;
    }

    console.log(`🛠  Using size ${size}...`);
    execCmd(
      `convert "${file}" -coalesce null: \\( "${this.overlayFile}" -resize ${size} \\) -gravity ${this.gravity} -layers composite  "${file}"`
    );
  }
}

module.exports = FilterOverlay;
