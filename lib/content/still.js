const {
  shell,
  getEpisodeName,
  getTimestamp
} = require('./utils');

class ContentStill {
  constructor({ seconds = null, num = 1, secondsApart = 5 } = {}) {
    this.seconds = seconds;
    this.num = num;
    this.secondsApart = secondsApart;
  }

  generate(input, output) {
    console.log(`📷 Processing ${output}`);

    const files = [];
    const timestamps = {};
    const name = getEpisodeName(output);
    const start = getTimestamp(input, this.seconds);
    const timestamp = [start, start + (this.num - 1) * this.secondsApart];

    for (let i = 0; i < this.num; i += 1) {
      const sec = start + this.secondsApart * i;
      const file = `${output} @ ${sec.toFixed(0)}s.png`;

      console.log(`🥚 Generating image ${file}`);

      shell(
        `ffmpeg -ss ${sec} -i "${input}" -vframes 1 -vf scale=iw*sar:ih -y "${file}"`
      );

      files.push(file);
      timestamps[file] = [sec, sec];
    }

    return {
      name,
      timestamp,
      files,
      timestamps
    };
  }
}

module.exports = ContentStill;
