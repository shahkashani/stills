const { readFileSync, writeFileSync } = require('fs');
const { sampleSize } = require('lodash');
const { destroy } = require('byebyte');
const { exec } = require('shelljs');

class GlitchPlugin {
  constructor({ minGlitch }) {
    this.minGlitch = minGlitch;
  }

  get name() {
    return 'glitch';
  }

  createGlitch(file) {
    let fileBuffer = readFileSync(file);
    fileBuffer = destroy({
      fileBuffer,
      len: fileBuffer.length,
      start: fileBuffer.length / 3,
      stop: fileBuffer.length,
      times: 300,
      output: file
    });
    writeFileSync(file, fileBuffer);
    // Fix the file back up so it can uploaded. ffmpeg can't edit in place, hence all this fuckery.
    const fix = exec(
      `ffmpeg -v warning -filter_complex "[0:v] fps=12,split [a][b];[a] palettegen=stats_mode=single [p];[b][p] paletteuse=new=1" -y -i "${file}" "${file}.gif" && rm "${file}" && mv "${file}.gif" "${file}"`,
      { silent: true }
    );
    if (fix.code === 1) {
      console.log(`Ooops: ${fix.stderr}`);
    }
  }

  async run(files) {
    const glitchFiles = sampleSize(
      files,
      Math.round(files.length * this.minGlitch)
    );
    for (const file of glitchFiles) {
      this.createGlitch(file);
    }
    return files;
  }
}

module.exports = GlitchPlugin;
