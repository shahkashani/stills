const {
  getTimestamps,
  getSourceSeconds,
  fillTimestamps,
  getVideoLength
} = require('./utils');
const { existsSync } = require('fs');

const execCmd = require('../utils/exec-cmd');
const getImageInfo = require('../utils/get-image-info');

class ContentVideo {
  constructor({
    seconds = null,
    secondsEnd = null,
    duration = 60,
    secondsApart = 20,
    timestamps
  } = {}) {
    this.seconds = getSourceSeconds(seconds);

    if (seconds && secondsEnd) {
      this.duration = getSourceSeconds(secondsEnd) - this.seconds;
    } else {
      this.duration = duration;
    }

    this.secondsApart = secondsApart;
    this.timestamps = timestamps;
  }

  async generate(input, output, num, timestamps, lengths) {
    console.log(`📹 Processing ${output}`);

    const inputTimestamps = timestamps || this.timestamps;
    const useTimestamps =
      Array.isArray(inputTimestamps) && inputTimestamps.length > 0
        ? fillTimestamps(inputTimestamps, this.secondsApart)
        : getTimestamps(
            getVideoLength(input),
            num,
            this.seconds,
            this.secondsApart,
            this.duration
          );

    const duration = this.duration;

    return useTimestamps.map((sec, i) => {
      const length = lengths ? lengths[i] : duration;
      const file = `${output} @ ${sec.toFixed(2)}s - ${length}.mp4`;
      const isExisting = existsSync(file);
      console.log(`🥚 Generating video: ${file}`);

      if (isExisting) {
        console.log(`🥚 Video already exists, skipping.`);
      } else {
        execCmd('ffmpeg', [
          '-i',
          input,
          '-ss',
          String(sec),
          '-t',
          String(length),
          '-c',
          'copy',
          '-y',
          file,
        ]);
      }

      const info = getImageInfo(file);

      return {
        file,
        isExisting,
        time: sec,
        length: this.duration,
        ...info
      };
    });
  }
}

module.exports = ContentVideo;
