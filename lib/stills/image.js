const Frames = require('./frames');
const { unlinkSync, copyFileSync } = require('fs');
const getHumanStats = require('../utils/get-human-stats');
const { map } = require('lodash');

class Image {
  constructor({ filename, minFaceConfidence }) {
    this.filename = filename;
    this.frames = new Frames({ filename, minFaceConfidence });
  }

  async getScenes() {
    return await this.frames.getScenes();
  }

  async prepare() {
    await this.frames.expand();
  }

  async collapse() {
    await this.frames.collapse();
  }

  async replace(url) {
    copyFileSync(url, this.filename);
    this.frames.delete();
    await this.frames.expand(true);
  }

  async replaceFrame(frame, url) {
    await this.frames.frames[frame].replace(url);
    await this.collapse();
  }

  async isAcceptable({ minFaces = 1, minStreak = 0.3 } = {}) {
    const minStreakLength = Math.round(this.frames.frames.length * minStreak);
    const results = [];
    for (const frame of this.frames.frames) {
      const humans = await frame.detectHumans();
      results.push({ count: humans.face.length });
    }
    const { streaks } = getHumanStats(results);
    const numFaces = Math.max(...map(streaks, 'faces'));
    const shortStreak = streaks.find(({ count }) => count < minStreakLength);
    console.log(`👨‍🎤 ${JSON.stringify({ minFaces, minStreakLength }, null, 2)}`);
    console.log(`👨‍🎤 ${JSON.stringify(streaks, null, 2)}`);
    return numFaces >= minFaces && !shortStreak;
  }

  delete() {
    unlinkSync(this.filename);
    this.frames.delete();
  }

  reset() {
    this.frames.reset();
  }

  getInfo() {
    return this.frames.getInfo();
  }

  getFrames() {
    return this.frames.frames;
  }

  deleteFrame(index) {
    this.frames.deleteFrame(index);
  }
}

module.exports = Image;
