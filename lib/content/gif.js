const getImageInfo = require('../utils/get-image-info');
const measure = require('../utils/measure');
const { getTimestamps, fillTimestamps } = require('./utils');
const getFrames = require('./utils/get-frames');
const makeGif = require('./utils/make-gif');

class ContentGif {
  constructor({
    width = 540,
    seconds = null,
    duration = 2,
    secondsApart = 5,
    timestamps
  } = {}) {
    this.width = width;
    this.duration = duration;
    this.seconds = seconds;
    this.timestamps = timestamps;
    this.secondsApart = secondsApart;
  }

  async generate(input, output, num, timestamps, lengths, options = {}) {
    console.log(`📹 Generating GIF from ${output}`);

    const fps = options.fps || 12;
    const fastPreview = options.fastPreview;

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

    const width = this.width;
    let results = [];
    let l = 0;

    for (const time of useTimestamps) {
      const length = lengths ? lengths[l] : this.duration;
      const buffers = await measure('getting stills', () =>
        getFrames(input, time, length, fps, width)
      );
      const file = `${output} @ ${time.toFixed(2)}s.gif`;
      await measure('making gif', () =>
        makeGif(file, buffers, fps, fastPreview)
      );
      const info = getImageInfo(file);
      const result = {
        ...info,
        buffers,
        file,
        time,
        length
      };
      results.push(result);
      l += 1;
    }
    return results;
  }
}

module.exports = ContentGif;
