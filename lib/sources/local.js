const glob = require('glob');
const { sample } = require('lodash');
const { parse } = require('path');
const { existsSync } = require('fs');

class SourceLocal {
  constructor({ folder }) {
    this.folder = folder;
  }

  async get() {
    if (!existsSync(this.folder)) {
      throw new Error(`Hey, "${this.folder}" does not exist.`);
    }
    const videos = glob.sync(`${this.folder}/*.{mp4,avi,mov,mkv}`);
    if (videos.length === 0) {
      throw new Error(`Yo, no videos in "${this.folder}"!`);
    }
    const input = sample(videos);
    const { name: output } = parse(input);
    return {
      input,
      output
    };
  }
}

module.exports = SourceLocal;
