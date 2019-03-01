const { readFileSync, writeFileSync } = require('fs');
const { destroy } = require('byebyte');
const { exec } = require('shelljs');

class FilterGlitch {
  constructor({ bytes = 300 }) {
    this.bytes = bytes;
  }

  get name() {
    return 'glitch';
  }

  async apply(file) {
    const fileBuffer = readFileSync(file);
    const destroyed = destroy({
      fileBuffer,
      len: fileBuffer.length,
      start: fileBuffer.length / 3,
      stop: fileBuffer.length,
      times: bytes,
      output: file
    });
    writeFileSync(file, destroyed);
    // Fix the file back up so it can uploaded. ffmpeg can't edit in place, hence all this juggling.
    const result = exec(
      `ffmpeg -v warning -filter_complex "[0:v] fps=12,split [a][b];[a] palettegen=stats_mode=single [p];[b][p] paletteuse=new=1" -y -i "${file}" "${file}.gif" && rm "${file}" && mv "${file}.gif" "${file}"`,
      { silent: true }
    );
    if (result.code === 1) {
      console.log(`🐞 Oops: ${cmd}`);
    }
  }
}

module.exports = FilterGlitch;
