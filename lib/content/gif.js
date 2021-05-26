const { shell, getTimestamp, getEpisodeName } = require('./utils');

class ContentGif {
  constructor({
    width = 540,
    seconds = null,
    duration = 2,
    fps = 12,
    num = 1,
    secondsApart = 5,
    genOptions = 'split [a][b];[a] palettegen=reserve_transparent=off:stats_mode=single [p];[b][p] paletteuse=new=1:dither=bayer:bayer_scale=3'
  } = {}) {
    this.width = width;
    this.duration = duration;
    this.fps = fps;
    this.seconds = seconds;
    this.num = num;
    this.secondsApart = secondsApart;
    this.genOptions = genOptions;
  }

  generate(input, output) {
    console.log(`📹 Processing ${output}`);

    const files = [];
    const timestamps = {};
    const name = getEpisodeName(output);
    const start = getTimestamp(input, this.seconds);
    const timestamp = [
      start,
      start + (this.duration + this.secondsApart) * this.num - this.secondsApart
    ];

    for (let i = 0; i < this.num; i += 1) {
      const sec = start + i * (this.secondsApart + this.duration);
      const file = `${output} @ ${sec.toFixed(0)}s.gif`;

      const duration = this.duration;
      const width = this.width;
      const fps = this.fps;

      console.log(`🥚 Generating GIF ${file}`);

      shell(
        `ffmpeg -ss ${sec} -t ${duration} -i "${input}" -v warning -filter_complex "[0:v] fps=${fps},scale=${width}:${width}/dar${
          this.genOptions ? `,${this.genOptions}` : ''
        }" -y "${file}"`
      );

      files.push(file);
      timestamps[file] = [sec, sec + this.duration];
    }

    return {
      name,
      timestamp,
      files,
      timestamps
    };
  }
}

module.exports = ContentGif;
