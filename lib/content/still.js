const getImageInfo = require('../utils/get-image-info');
const {
  shell,
  getTimestamps,
  fillTimestamps,
  getSourceSeconds
} = require('./utils');

class ContentStill {
  constructor({ seconds = null, secondsApart = 5 } = {}) {
    this.seconds = getSourceSeconds(seconds);
    this.secondsApart = secondsApart || 5;
  }

  async generate(input, output, num, timestamps) {
    console.log(`📷 Processing ${output}`);

    const useTimestamps =
      Array.isArray(timestamps) && timestamps.length > 0
        ? fillTimestamps(timestamps, this.secondsApart)
        : getTimestamps(input, num, this.seconds, this.secondsApart);

    return useTimestamps.map((sec) => {
      const file = `${output} @ ${sec.toFixed(2)}s.png`;
      console.log(`🥚 Generating still: ${file}`);
      shell(
        `ffmpeg -ss ${sec} -i "${input}" -vframes 1 -vf scale=iw*sar:ih -y "${file}"`
      );
      const info = getImageInfo(file);
      return {
        ...info,
        file,
        time: sec,
        length: 0
      };
    });
  }
}

module.exports = ContentStill;
