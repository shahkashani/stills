const imageOutput = require('image-output');
const { execCmd, processAsStills } = require('./utils');
const { getBodyMap } = require('../utils/faces');
const { unlinkSync } = require('fs');

class FilterBackdrop {
  constructor({ edge = '-canny 0x1+1%+20%' } = {}) {
    this.edge = edge;
  }

  get name() {
    return 'backdrop';
  }

  async apply(file) {
    await processAsStills(file, async (png) => {
      const segmentation = await getBodyMap(png);
      if (segmentation) {
        const mask = `mask-${png}.png`;
        imageOutput(segmentation, mask);
        execCmd(
          `convert "${png}" \\( +clone ${this.edge} \\( "${mask}" -negate \\) -alpha off -compose CopyOpacity -composite \\) -compose over -composite "${png}"`
        );
        unlinkSync(mask);
      } else {
        execCmd(`convert "${png}" ${this.edge} "${png}"`);
      }
    });
    execCmd(
      `convert "${file}" -type grayscale -brightness-contrast 15x35 "${file}"`
    );
  }
}

module.exports = FilterBackdrop;
