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
      min: 0,
      max: 1,
      times: 100,
      output: file
    });
    writeFileSync(file, fileBuffer);
    // Fix the file back up so it can uploaded. ffmpeg can't edit in place, hence all this fuckery.
    const fix = exec(
      `ffmpeg -y -i "${file}" "${file}.gif" && rm "${file}" && mv "${file}.gif" "${file}"`,
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
