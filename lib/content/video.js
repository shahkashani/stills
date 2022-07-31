const { getTimestamps, getSourceSeconds, fillTimestamps } = require('./utils');

const execCmd = require('../utils/exec-cmd');

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

  generate(input, output, num, timestamps, lengths) {
    console.log(`📹 Processing ${output}`);

    const inputTimestamps = timestamps || this.timestamps;
    const useTimestamps =
      Array.isArray(inputTimestamps) && inputTimestamps.length > 0
        ? fillTimestamps(inputTimestamps, this.secondsApart)
        : getTimestamps(
            input,
            num,
            this.seconds,
            this.secondsApart,
            this.duration
          );

    const duration = this.duration;

    return useTimestamps.map((sec, i) => {
      const file = `${output} @ ${sec.toFixed(2)}s.mp4`;
      const length = lengths ? lengths[i] : duration;
      console.log(`🥚 Generating video: ${file}`);

      execCmd(
        `ffmpeg -i "${input}" -ss ${sec} -t ${length} -c copy -y "${file}"`
      );

      return {
        file,
        time: sec,
        length: this.duration
      };
    });
  }
}

module.exports = ContentVideo;
