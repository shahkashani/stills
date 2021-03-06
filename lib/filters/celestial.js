const imageOutput = require('image-output');
const { execCmd, processAsStills } = require('./utils');
const { getBodyMap } = require('../utils/faces');
const { unlinkSync } = require('fs');

const DEFAULT_ACCENT = '#ffe641';

class FilterCelestial {
  constructor({ bodies, isGrayScale = true } = {}) {
    this.bodies = bodies || [
      { fill: DEFAULT_ACCENT, opacity: 1, blur: '20%' },
      { fill: DEFAULT_ACCENT, opacity: 1, blur: '10%' },
      { fill: DEFAULT_ACCENT, opacity: 1, blur: '5%' },
      { fill: 'white', opacity: 0.9, blur: '2%' }
    ];
    this.isGrayScale = isGrayScale;
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
        this.bodies.forEach(({ blur, fill, opacity, stroke }) => {
          const o = opacity
            ? `-matte -channel A +level 0,${opacity * 100}%`
            : '';
          const b = blur ? `-blur 0x${blur}` : '';
          const s = stroke ? `-edge ${stroke}` : '';
          execCmd(
            `convert "${png}" \\( +clone -fill "${fill}" -colorize 100 \\( "${mask}" ${s} \\) -alpha off -compose CopyOpacity -composite ${o} ${b} \\) -compose over -composite "${png}"`
          );
        });
        unlinkSync(mask);
      }
    });
    if (this.isGrayScale) {
      execCmd(
        `convert "${file}" -type grayscale -brightness-contrast 5x20 "${file}"`
      );
    }
  }
}

module.exports = FilterCelestial;
