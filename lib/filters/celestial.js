const imageOutput = require('image-output');
const { execCmd, processAsStills } = require('./utils');
const { getBodyMap } = require('../utils/faces');
const { unlinkSync } = require('fs');

class FilterCelestial {
  constructor({ blur = '0x20%', fill = '#fcc5d8', opacity = 0.3 } = {}) {
    this.blur = blur;
    this.fill = fill;
    this.opacity = opacity;
  }

  get name() {
    return 'celestial';
  }

  async apply(file) {
    await processAsStills(file, async (png) => {
      const segmentation = await getBodyMap(png);
      if (segmentation) {
        const mask = `mask-${png}.png`;
        imageOutput(segmentation, mask);
        execCmd(
          `convert "${png}" \\( +clone -fill "${
            this.fill
          }" -colorize 100 \\( "${mask}" \\) -alpha off -compose CopyOpacity -composite -matte -channel A +level 0,${
            this.opacity * 100
          }% -blur ${this.blur} \\) -compose over -composite "${png}"`
        );
        unlinkSync(mask);
      }
    });
  }
}

module.exports = FilterCelestial;
