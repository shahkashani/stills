const exec = require('./exec');
const { range } = require('lodash');

const getHalos = (
  accent = '#ffe641',
  accentOpacity = 0.5,
  fill = 'black',
  fillOpacity = 1,
  numBodies = 10
) => {
  const startBlur = 5;
  const accents = range(numBodies, 0).map((i) => ({
    fill: accent,
    opacity: accentOpacity,
    blur: `${startBlur * i}%`
  }));
  return [...accents, { fill, opacity: fillOpacity, blur: '2%' }];
};

module.exports = async (frame) => {
  const halos = getHalos();
  const mask = await frame.getMask(0.4, frame.parts.NO_HANDS);
  if (mask) {
    for (const halo of halos) {
      const { blur, fill, opacity, stroke } = halo;
      const o = opacity ? `-matte -channel A +level 0,${opacity * 100}%` : '';
      const b = blur ? `-blur 0x${blur}` : '';
      const s = stroke ? `-edge ${stroke}` : '';
      await exec(
        frame,
        `\\( +clone -fill "${fill}" -colorize 100 \\( "${mask}" -negate ${s} \\) -alpha off -compose CopyOpacity -composite ${o} ${b} \\) -compose over -composite`
      );
    }
  }
};
