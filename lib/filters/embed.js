const { execCmd, processAsStills } = require('./utils');
const { unlinkSync, copyFileSync } = require('fs');

class FilterEmbed {
  constructor({ background, mask, positions } = {}) {
    this.background = background;
    this.mask = mask;
    this.positions = positions;
  }

  get name() {
    return 'embed';
  }

  async apply(file, getInfo) {
    const { numFrames } = getInfo(file);
    const resize = numFrames > 1 ? '-resize 720x' : '';

    await processAsStills(file, async (png) => {
      const orig = `orig-${png}`;
      copyFileSync(png, orig);
      execCmd(`convert "${this.background}" "${png}"`);
      this.positions.forEach(({ x, y, width, height, rotate, flip, flop }) => {
        const r = rotate ? `-rotate ${rotate}` : '';
        const f1 = flip ? `-flip` : '';
        const f2 = flop ? `-flop` : '';
        execCmd(
          `convert "${png}" -coalesce null: \\( "${orig}" -resize "${width}x${height}^" -gravity center -extent ${width}x${height} -gravity northwest ${r} ${f1} ${f2} \\) -geometry +${x}+${y} -layers composite "${png}"`
        );
      });
      unlinkSync(orig);
      execCmd(
        `convert "${png}" \\( "${this.background}" \\( "${this.mask}" \\) -alpha off -compose CopyOpacity \\) -compose over -composite ${resize} "${png}"`
      );
    });
  }
}

module.exports = FilterEmbed;
