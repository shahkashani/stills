const { getVideoLength, getRandomTimestamp, shell } = require('./utils');

class ContentGif {
  constructor({
    width = 540,
    seconds = null,
    duration = 2,
    fps = 12,
    num = 1,
    secondsApart = 5
  } = {}) {
    this.width = width;
    this.duration = duration;
    this.fps = fps;
    this.seconds = seconds;
    this.num = num;
    this.secondsApart = secondsApart;
  }

  generate(input, output) {
    console.log(`📹 Processing ${output}`);

    const outputFiles = [];

    const length = getVideoLength(input);
    const start = Number.isFinite(this.seconds)
      ? this.seconds
      : getRandomTimestamp(length);

    for (let i = 0; i < this.num; i += 1) {
      const sec = start + i * this.secondsApart;
      const outputFile = `${output} @ ${sec.toFixed(0)}s.gif`;

      const duration = this.duration;
      const width = this.width;
      const fps = this.fps;

      console.log(`🥚 Generating GIF ${outputFile}`);

      shell(
        `ffmpeg -ss ${sec} -t ${duration} -i "${input}" -v warning -filter_complex "[0:v] fps=${fps},scale=${width}:${width}/dar,split [a][b];[a] palettegen=reserve_transparent=off:stats_mode=single [p];[b][p] paletteuse=new=1" -y "${outputFile}"`
      );

      outputFiles.push(outputFile);
    }

    return outputFiles;
  }
}

module.exports = ContentGif;
