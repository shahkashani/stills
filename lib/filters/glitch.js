const { readFileSync, writeFileSync } = require('fs');
const { destroy } = require('byebyte');
const { exec } = require('shelljs');
const { parse } = require('path');
const { sample } = require('lodash');

class FilterGlitch {
  constructor({ min = 0.1, max = 0.5, times = sample(200, 800) } = {}) {
    this.options = {
      min,
      max,
      times
    };
  }

  get name() {
    return 'glitch';
  }

  async apply(file) {
    const fileBuffer = readFileSync(file);

    const destroyed = destroy({
      fileBuffer,
      len: fileBuffer.length,
      output: file,
      ...this.options
    });

    writeFileSync(file, destroyed);

    // Fix the file back up so it can uploaded. ffmpeg can't edit in place, hence all this juggling via a temp file.

    const { name, ext } = parse(file);
    const tmp = `${name}-temp${ext}`;

    const result = exec(
      `ffmpeg -v warning -filter_complex "[0:v] fps=12,split [a][b];[a] palettegen=reserve_transparent=off:stats_mode=single [p];[b][p] paletteuse=new=1" -y -i "${file}" "${tmp}" && rm "${file}" && mv "${tmp}" "${file}"`,
      { silent: true }
    );

    if (result.code === 1) {
      console.log(`🐞 Oops: ${cmd}`);
    }
  }
}

module.exports = FilterGlitch;
