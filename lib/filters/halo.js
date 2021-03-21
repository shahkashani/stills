const imageOutput = require('image-output');
const { execCmd, processAsStills } = require('./utils');
const { getBodyMap } = require('../utils/faces');
const { unlinkSync } = require('fs');

class FilterHalo {
  constructor({ halos } = {}) {
    this.halos = halos || [{ opacity: 0.5, scale: 1.2, blur: 0.01 }];
  }

  get name() {
    return 'halo';
  }

  async apply(file, getImageInfo) {
    const { width, height } = getImageInfo(file);
    await processAsStills(file, async (png) => {
      const segmentation = await getBodyMap(png);
      if (segmentation) {
        const mask = `mask-${png}.png`;
        imageOutput(segmentation, mask);
        this.halos.forEach(({ scale, opacity, blur }) => {
          const b = blur ? `-blur 0x${Math.floor(width * blur)}` : '';
          console.log(b);
          const o = `-matte -channel A +level 0,${opacity * 100}%`;
          const s = `${scale * 100}%`;
          const x = (width * (scale - 1)) / 2;
          const y = (height * (scale - 1)) / 2;
          execCmd(
            `convert "${png}" \\( +clone \\( "${mask}" ${b} \\) -alpha off -compose CopyOpacity -scale ${s} -composite ${o} \\) -geometry -${x}-${y} -compose over -composite "${png}"`
          );
        });
        unlinkSync(mask);
      }
    });
  }
}

module.exports = FilterHalo;
