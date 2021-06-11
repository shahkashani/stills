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

  getVideos() {
    return glob.sync(`${this.folder}/**/*.{mp4,avi,mov,mkv}`);
  }

  getRandom(videos) {
    return sample(videos);
  }

  getByName(videos, epName) {
    return videos.find((file) => {
      const { name } = parse(file);
      return name.indexOf(epName) === 0;
    });
  }

  getByFilter(videos, filter) {
    return sample(videos.filter(filter));
  }

  async getAllNames() {
    const videos = this.getVideos();
    return videos.map((video) => {
      const { name } = parse(video);
      return name;
    });
  }

  async get(epName = null) {
    if (!existsSync(this.folder)) {
      throw new Error(`Hey, "${this.folder}" does not exist.`);
    }
    const videos = this.getVideos();
    if (videos.length === 0) {
      throw new Error(`Yo, no videos in "${this.folder}"!`);
    }
    // @todo Add filter back in here
    const input = epName
      ? this.getByName(videos, epName)
      : this.getRandom(videos);
    const { name } = parse(input);
    const output = `${this.outputFolder ? `${this.outputFolder}/` : ''}${name}`;
    return {
      name,
      input,
      output
    };
  }
}

module.exports = SourceLocal;
