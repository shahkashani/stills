const imageOutput = require('image-output');
const { execCmd } = require('./utils');
const { unlinkSync } = require('fs');

class FilterBackdrop {
  constructor({
    edge = '-canny 0x1+5%+10%',
    segmentationThreshold = 0.85
  } = {}) {
    this.edge = edge;
    this.segmentationThreshold = segmentationThreshold;
  }

  get name() {
    return 'backdrop';
  }

  async applyFrame(frame) {
    const file = frame.file;
    const segmentation = await frame.getBodies(this.segmentationThreshold);
    if (segmentation) {
      const mask = `mask-${file}`;
      imageOutput(segmentation, mask);
      execCmd(
        `convert "${file}" \\( +clone ${this.edge} \\( "${mask}" \\) -alpha off -compose CopyOpacity -composite \\) -compose over -composite "${file}"`
      );
      unlinkSync(mask);
    } else {
      execCmd(`convert "${file}" ${this.edge} "${file}"`);
    }
    execCmd(
      `convert "${file}" -type grayscale -brightness-contrast 15x35 "${file}"`
    );
  }
}

module.exports = FilterBackdrop;
