const getImageInfo = require('../utils/get-image-info');
const {
  getTimestamps,
  fillTimestamps,
  getSourceSeconds,
  getVideoLength
} = require('./utils');
const getFrame = require('./utils/get-frame');
const makePng = require('./utils/make-png');

class ContentStill {
  constructor({ seconds = null, secondsApart = 5 } = {}) {
    this.seconds = getSourceSeconds(seconds);
    this.secondsApart = secondsApart || 5;
  }

  async generate(input, output, num, timestamps) {
    console.log(`📹 Generating still from ${output}`);

    const useTimestamps =
      Array.isArray(timestamps) && timestamps.length > 0
        ? fillTimestamps(timestamps, this.secondsApart)
        : getTimestamps(
            getVideoLength(input),
            num,
            this.seconds,
            this.secondsApart
          );

    const results = [];
    for (const time of useTimestamps) {
      const file = `${output} @ ${time.toFixed(2)}s.png`;
      const buffer = await getFrame(input, time);
      await makePng(file, buffer);
      const info = getImageInfo(file);
      const result = {
        ...info,
        buffers: [buffer],
        file,
        time,
        length: 0
      };
      results.push(result);
    }
    return results;
  }
}

module.exports = ContentStill;
