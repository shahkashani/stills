const getImageInfo = require('../utils/get-image-info');
const { shell, getTimestamps, fillTimestamps } = require('./utils');
const { statSync } = require('fs');
const getFrames = require('./utils/get-frames');

class ContentGif {
  constructor({
    width = 540,
    seconds = null,
    duration = 2,
    fps = 12,
    secondsApart = 5,
    timestamps,
    genOptions = 'split [a][b];[a] palettegen=reserve_transparent=off:stats_mode=single [p];[b][p] paletteuse=new=1:dither=bayer:bayer_scale=3'
  } = {}) {
    this.width = width;
    this.duration = duration;
    this.fps = fps;
    this.seconds = seconds;
    this.timestamps = timestamps;
    this.secondsApart = secondsApart;
    this.genOptions = genOptions;
  }

  async generate(input, output, num, timestamps, lengths) {
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
    const width = this.width;
    const fps = this.fps;
    let allBuffers = [];
    let l = 0;

    for (const timestamp in useTimestamps) {
      const length = lengths ? lengths[l] : duration;
      const buffers = await getFrames(input, timestamp, length, fps, width);
      allBuffers.push(buffers);
      l += 1;
    }

    console.log(allBuffers);

    return useTimestamps.map((sec, i) => {
      let isValid = false;
      let file;
      let count = 0;
      while (!isValid) {
        file = `${output} @ ${sec.toFixed(2)}s.gif`;
        const length = lengths ? lengths[i] : duration;
        console.log(`🥚 Generating GIF: ${file}`);

        shell(
          `ffmpeg -ss ${sec} -t ${length} -i "${input}" -v warning -filter_complex "[0:v] fps=${fps},scale=${width}:${width}/dar${
            this.genOptions ? `,${this.genOptions}` : ''
          }" -y "${file}"`
        );

        const { size } = statSync(file);

        isValid = size > 0;
        if (!isValid) {
          console.log('GIF not valid, trying again.');
          count += 1;
        }
        if (count > 10) {
          console.error('Giving up.');
          process.exit(1);
        }
      }
      const info = getImageInfo(file);
      return {
        ...info,
        file,
        time: sec,
        length: this.duration
      };
    });
  }
}

module.exports = ContentGif;
