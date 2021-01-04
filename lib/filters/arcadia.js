const { transformFrames, processAsStills } = require('./utils');
const { execCmd } = require('./utils');

class FilterArcadia {
  constructor({
    fill = '#222b6d',
    colorize = 20,
    modulate = '135,10,100',
    gamma = 0.5,
    blur = '0x10',
    blurOpacity = 0.5,
    contrastStretch = '25%x0.05%',
  } = {}) {
    this.fill = fill;
    this.colorize = colorize;
    this.gamma = gamma;
    this.blur = blur;
    this.blurOpacity = blurOpacity;
    this.modulate = modulate;
    this.contrastStretch = contrastStretch;
  }

  get name() {
    return 'arcadia';
  }

  transform(base, frame) {
    const buf = Buffer.alloc(base.length);
    for (let j = 0; j < buf.length; j++) {
      buf[j] = frame[j] * 0.5 + base[j] * 0.5;
    }
    return buf;
  }

  async apply(file) {
    await transformFrames(file, this.transform, false, (image) => {
      return image;
    });

    await processAsStills(file, async (png) => {
      execCmd(
        `convert "${png}" -coalesce null: \\( -clone 0 -filter Gaussian -blur ${
          this.blur
        } -matte -channel A +level 0,${
          this.blurOpacity * 100
        }% \\) -gravity center -layers composite "${png}"`
      );
    });

    execCmd(
      `convert "${file}" -modulate ${this.modulate} -fill '${this.fill}' -colorize ${this.colorize} -gamma ${this.gamma} -contrast-stretch ${this.contrastStretch} "${file}"`
    );
  }
}

module.exports = FilterArcadia;
