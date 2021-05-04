const { execCmd, getAsStills, processAsStills } = require('./utils');

class FilterOverlay {
  constructor({
    overlayFile = null,
    gravity = 'center',
    size = null,
    sizePercentWidth = null,
    sizePercentHeight = null,
    geometry = null,
    compose = null,
    opacity = 100
  } = {}) {
    this.opacity = opacity;
    this.size = size;
    this.sizePercentWidth = sizePercentWidth;
    this.sizePercentHeight = sizePercentHeight;
    this.overlayFile = overlayFile;
    this.gravity = gravity;
    this.geometry = geometry;
    this.compose = compose;
  }

  get name() {
    return 'overlay';
  }

  static get name() {
    return 'overlay';
  }

  getWidth(input, desiredWidth, desiredHeight) {
    if (!desiredHeight) {
      return desiredWidth;
    }
    const { width, height } = getImageInfo(input);
    const newHeight = (desiredWidth / width) * height;
    return newHeight < desiredHeight
      ? Math.ceil(width / (height / desiredHeight))
      : desiredWidth;
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
    return `${width}x${height}^`;
  }

  getOpacity() {
    if (this.opacity === 100) {
      return '';
    }
    return `-matte -channel A +level 0,${this.opacity}%`;
  }

  exec(file, overlayFile, width, height) {
    const opacity = this.getOpacity();
    const size = this.getSize(width, height);
    const geometry = this.geometry ? `-geometry ${this.geometry}` : '';
    const compose = this.compose ? `-compose ${this.compose}` : '';
    execCmd(
      `convert "${file}" -coalesce null: \\( "${overlayFile}" -modulate 100,0 -resize ${size} ${opacity} \\) -gravity ${this.gravity} ${geometry} ${compose} -layers composite "${file}"`
    );
  }

  async apply(file, getImageInfo) {
    const { width, height } = getImageInfo(file);
    const { numFrames: overlayFrames } = getImageInfo(this.overlayFile);

    if (overlayFrames > 1) {
      const [stills, deleteStills] = getAsStills(this.overlayFile);
      if (stills.length !== overlayFrames) {
        process.exit(
          'Broken down still count does not match original GIF count'
        );
      }
      await processAsStills(file, async (png, _p, index) => {
        const overlay = stills[index % stills.length];
        this.exec(png, overlay, width, height);
      });
      deleteStills();
    } else {
      this.exec(file, this.overlayFile, width, height);
    }
  }
}

module.exports = FilterOverlay;
