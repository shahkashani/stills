const { execCmd } = require('./utils');

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

  async applyFrame(frame, { numImage, numImages, numFrames }) {
    const file = frame.file;
    const resize = numFrames > 1 ? '-resize 720x' : '';
    const background = this.getBackground(numImages, numImage);
    execCmd(`convert "${background}" "${file}"`);
    this.positions.forEach(({ x, y, width, height, rotate, flip, flop }) => {
      const r = rotate ? `-rotate ${rotate}` : '';
      const f1 = flip ? `-flip` : '';
      const f2 = flop ? `-flop` : '';
      execCmd(
        `convert "${file}" -coalesce null: \\( "${frame.original}" -resize "${width}x${height}^" -gravity center -extent ${width}x${height} -gravity northwest ${r} ${f1} ${f2} \\) -geometry +${x}+${y} -layers composite "${file}"`
      );
    });
    execCmd(
      `convert "${file}" \\( "${background}" \\( "${this.mask}" \\) -alpha off -compose CopyOpacity \\) -compose over -composite ${resize} "${file}"`
    );
  }
}

module.exports = FilterEmbed;
