const imageOutput = require('image-output');
const { execCmd, getRawDrawCommand } = require('./utils');
const { getBoundingBox } = require('../utils/faces');
const { unlinkSync } = require('fs');

const DEFAULT_ACCENT = '#ffe641';

class FilterCelestial {
  constructor({ bodies, isGrayScale = true, isFillEyes = false } = {}) {
    this.bodies = bodies || [
      { fill: DEFAULT_ACCENT, opacity: 1, blur: '20%' },
      { fill: DEFAULT_ACCENT, opacity: 1, blur: '10%' },
      { fill: DEFAULT_ACCENT, opacity: 1, blur: '5%' },
      { fill: 'white', opacity: 0.9, blur: '2%' }
    ];
    this.isFillEyes = isFillEyes;
    this.isGrayScale = isGrayScale;
  }

  get name() {
    return 'celestial';
  }

  getFeaturesCmd(file, pointSet, size) {
    const { x, y } = getBoundingBox(pointSet);
    const startX = x + size / 2;
    const startY = y + size / 2;
    return getRawDrawCommand(
      file,
      `-draw 'circle ${startX},${startY} ${startX},${startY + size}'`,
      {
        fill: '#000000',
        effects: `-blur 0x${size * 0.15}`
      }
    );
  }

  async applyFrame(frame) {
    const file = frame.file;
    const segmentation = await frame.getBodies(0.4);
    if (segmentation) {
      const faces = this.isFillEyes ? await frame.getFaces() : [];
      const mask = `mask-${file}.file`;
      imageOutput(segmentation, mask);
      this.bodies.forEach(({ blur, fill, opacity, stroke }) => {
        const o = opacity ? `-matte -channel A +level 0,${opacity * 100}%` : '';
        const b = blur ? `-blur 0x${blur}` : '';
        const s = stroke ? `-edge ${stroke}` : '';
        execCmd(
          `convert "${file}" \\( +clone -fill "${fill}" -colorize 100 \\( "${mask}" -negate ${s} \\) -alpha off -compose CopyOpacity -composite ${o} ${b} \\) -compose over -composite "${file}"`
        );
      });
      for (const face of faces) {
        const bounds = getBoundingBox(face.landmarks.getLeftEye());
        const size = Math.min(bounds.width, bounds.height);
        execCmd(this.getFeaturesCmd(file, face.landmarks.getLeftEye(), size));
        execCmd(this.getFeaturesCmd(file, face.landmarks.getRightEye(), size));
      }
      unlinkSync(mask);
    }
    if (this.isGrayScale) {
      execCmd(
        `convert "${file}" -type grayscale -sigmoidal-contrast 4x75% "${file}"`
      );
    }
  }
}

module.exports = FilterCelestial;
