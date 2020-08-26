const { getVideoLength, getRandomTimestamp, shell } = require('./utils');

class ContentStill {
  constructor({ seconds = null, num = 1, secondsApart = 5 } = {}) {
    this.seconds = seconds;
    this.num = num;
    this.secondsApart = secondsApart;
  }

  generate(input, output) {
    console.log(`📷 Processing ${output}`);

    const outputFiles = [];
    const length = getVideoLength(input);
    const start = Number.isFinite(this.seconds)
      ? this.seconds
      : getRandomTimestamp(length);

    for (let i = 0; i < this.num; i += 1) {
      const sec = start + this.secondsApart * i;
      const outputFile = `${output} @ ${sec.toFixed(0)}s.png`;

      console.log(`🥚 Generating image ${outputFile}`);

      shell(
        `ffmpeg -ss ${sec} -i "${input}" -vframes 1 -vf scale=iw*sar:ih -y "${outputFile}"`
      );

      outputFiles.push(outputFile);
    }

    return outputFiles;
  }
}

module.exports = ContentStill;
