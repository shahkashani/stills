const imageOutput = require('image-output');
const { execCmd } = require('./utils');
const { unlinkSync } = require('fs');

class FilterHalo {
  constructor({ halos } = {}) {
    this.halos = halos || [{ opacity: 0.5, scale: 1.2, blur: 0.01 }];
  }

  get name() {
    return 'halo';
  }

  async applyFrame(frame) {
    const file = frame.file;
    const { width, height } = frame.getInfo(file);
    const segmentation = await frame.getBodies();
    if (segmentation) {
      const mask = `mask-${file}`;
      imageOutput(segmentation, mask);
      this.halos.forEach(({ scale, opacity, blur }) => {
        const b = blur ? `-blur 0x${Math.floor(width * blur)}` : '';
        const o = `-matte -channel A +level 0,${opacity * 100}%`;
        const s = `${scale * 100}%`;
        const x = (width * (scale - 1)) / 2;
        const y = (height * (scale - 1)) / 2;
        execCmd(
          `convert "${file}" \\( +clone \\( "${mask}" -negate ${b} \\) -alpha off -compose CopyOpacity -scale ${s} -composite ${o} \\) -geometry -${x}-${y} -compose over -composite "${file}"`
        );
      });
      unlinkSync(mask);
    }
  }
}

module.exports = FilterHalo;
