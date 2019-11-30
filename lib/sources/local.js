const glob = require('glob');
const { sample } = require('lodash');
const { parse } = require('path');
const { existsSync } = require('fs');

class SourceLocal {
  constructor({ folder, filter, outputFolder }) {
    this.folder = folder;
    this.filter = filter;
    this.outputFolder = outputFolder;
  }

  async get() {
    if (!existsSync(this.folder)) {
      throw new Error(`Hey, "${this.folder}" does not exist.`);
    }
    const videos = glob.sync(
      `${this.folder}/*${
        this.filter ? `${this.filter}*` : ''
      }.{mp4,avi,mov,mkv}`
    );
    if (videos.length === 0) {
      throw new Error(`Yo, no videos in "${this.folder}"!`);
    }
    const input = sample(videos);
    const { name } = parse(input);
    const output = `${this.outputFolder ? `${this.outputFolder}/` : ''}${name}`;
    return {
      input,
      output
    };
  }
}

module.exports = SourceLocal;
