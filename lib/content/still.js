const { shell, getTimestamps } = require('./utils');

class ContentStill {
  constructor({ seconds = null, secondsApart = 5 } = {}) {
    this.seconds = seconds;
    this.secondsApart = secondsApart;
  }

  generate(input, output, num, timestamps) {
    console.log(`📷 Processing ${output}`);

    const useTimestamps =
      Array.isArray(timestamps) && timestamps.length > 0
        ? timestamps
        : getTimestamps(input, num, this.seconds, this.secondsApart);

    return useTimestamps.map((sec) => {
      const file = `${output} @ ${sec.toFixed(0)}s.png`;
      console.log(`🥚 Generating still: ${file}`);
      shell(
        `ffmpeg -ss ${sec} -i "${input}" -vframes 1 -vf scale=iw*sar:ih -y "${file}"`
      );

      return file;
    });
  }
}

module.exports = ContentStill;
