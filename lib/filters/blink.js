const { getVideoLength, getRandomTimestamp } = require('../content/utils');
const { execCmd } = require('./utils');
const { unlinkSync } = require('fs');
const { random } = require('lodash');

class FilterBlink {
  constructor({ source } = {}) {
    this.source = source;
  }

  get name() {
    return 'blink';
  }

  async apply(file, getImageInfo) {
    const { width, height, numFrames } = getImageInfo(file);
    const outputFile = `blink-${file}.png`;
    const timestamp = getRandomTimestamp(getVideoLength(this.source));
    const replaceFrame = random(3, numFrames);

    execCmd(
      `ffmpeg -ss ${timestamp} -i "${this.source}" -vframes 1 -vf scale=iw*sar:ih -y "${outputFile}"`
    );

    execCmd(
      `convert "${outputFile}" -resize "${width}x${height}^" -gravity center -extent ${width}x${height} "${outputFile}"`
    );

    execCmd(
      `convert "${file}" \\( -clone 0-${replaceFrame} \\) \\( "${outputFile}" -set delay 0 \\) \\( -clone ${replaceFrame}-${numFrames} \\) -delete 0-${numFrames} "${file}"`
    );

    unlinkSync(outputFile);
  }
}

module.exports = FilterBlink;
