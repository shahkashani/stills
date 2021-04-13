const { execCmd, processAsStills } = require('./utils');
const { getFaces, getBoundingBox } = require('../utils/faces');

class FilterEmbed {
  constructor({ background, mask, width, height, x, y } = {}) {
    this.background = background;
    this.mask = mask;
    this.width = width;
    this.height = height;
    this.x = x;
    this.y = y;
  }

  get name() {
    return 'embed';
  }

  async apply(file, getInfo) {
    const { numFrames } = getInfo(file);
    const resize = numFrames > 1 ? '-resize 720x' : '';

    await processAsStills(file, async (png) => {
      execCmd(
        `convert "${this.background}" -coalesce null: \\( "${png}" -resize "${this.width}x${this.height}^" -gravity center -extent ${this.width}x${this.height} -gravity northwest \\) -geometry +${this.x}+${this.y} -layers composite "${png}"`
      );
      execCmd(
        `convert "${png}" \\( "${this.background}" \\( "${this.mask}" \\) -alpha off -compose CopyOpacity \\) -compose over -composite ${resize} "${png}"`
      );
    });
  }
}

module.exports = FilterEmbed;
