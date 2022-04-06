const { shell, getTimestamp, getTimestamps } = require('./utils');

class ContentGif {
  constructor({
    width = 540,
    seconds = null,
    duration = 2,
    fps = 12,
    secondsApart = 5,
    genOptions = 'split [a][b];[a] palettegen=reserve_transparent=off:stats_mode=single [p];[b][p] paletteuse=new=1:dither=bayer:bayer_scale=3'
  } = {}) {
    this.width = width;
    this.duration = duration;
    this.fps = fps;
    this.seconds = seconds;
    this.secondsApart = secondsApart;
    this.genOptions = genOptions;
  }

  generate(input, output, num, timestamps, lengths) {
    console.log(`📹 Processing ${output}`);

    const useTimestamps =
      Array.isArray(timestamps) && timestamps.length > 0
        ? timestamps
        : getTimestamps(
            input,
            num,
            this.seconds,
            this.secondsApart,
            this.duration
          );

    const duration = this.duration;
    const width = this.width;
    const fps = this.fps;

    return useTimestamps.map((sec, i) => {
      const file = `${output} @ ${sec.toFixed(2)}s.gif`;
      const length = lengths ? lengths[i] : duration;
      console.log(`🥚 Generating GIF: ${file}`);
      shell(
        `ffmpeg -ss ${sec} -t ${length} -i "${input}" -v warning -filter_complex "[0:v] fps=${fps},scale=${width}:${width}/dar${
          this.genOptions ? `,${this.genOptions}` : ''
        }" -y "${file}"`
      );
      return {
        file,
        time: sec,
        length: this.duration
      };
    });
  }
}

module.exports = ContentGif;
