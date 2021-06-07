const { execCmd, processAsStills } = require('./utils');
const { unlinkSync, copyFileSync } = require('fs');

class FilterEmbed {
  constructor({ background, backgrounds, mask, positions } = {}) {
    this.background = background;
    this.backgrounds = backgrounds;
    this.mask = mask;
    this.positions = positions;
  }

  get name() {
    return 'embed';
  }

  getBackground(numImages, index) {
    if (
      numImages === 1 ||
      !this.backgrounds ||
      !this.backgrounds.length === 0
    ) {
      return this.background;
    }
    return this.backgrounds[index % this.backgrounds.length];
  }

  async apply(file, getInfo, index, numImages) {
    const { numFrames } = getInfo(file);
    const resize = numFrames > 1 ? '-resize 720x' : '';
    const background = this.getBackground(numImages, index);

    await processAsStills(file, async (png) => {
      const orig = `orig-${png}`;
      copyFileSync(png, orig);
      execCmd(`convert "${background}" "${png}"`);
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
        `convert "${png}" \\( "${background}" \\( "${this.mask}" \\) -alpha off -compose CopyOpacity \\) -compose over -composite ${resize} "${png}"`
      );
    });
  }
}

module.exports = FilterEmbed;
