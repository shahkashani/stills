const getImageInfo = require('../utils/get-image-info');
const measure = require('../utils/measure');
const { getTimestamps, fillTimestamps, getVideoLength } = require('./utils');
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

    const videoLength = getVideoLength(input);

    const fps = options.fps || 12;
    const fastPreview = options.fastPreview;
    const isSmartSetup = options.isSmartSetup;

    const inputTimestamps = timestamps || this.timestamps;

    let canUseInputTimestamps =
      Array.isArray(inputTimestamps) && inputTimestamps.length > 0;

    if (canUseInputTimestamps) {
      const isExceeds = inputTimestamps.find(
        (timestamp) => timestamp + this.duration > videoLength
      );
      if (isExceeds) {
        console.log(`👀 Timestamp exceeds ${videoLength}`, inputTimestamps);
        canUseInputTimestamps = false;
      }
    }

    if (this.seconds && this.seconds + this.duration > videoLength) {
      console.log(
        `👀 Given second ${this.seconds} exceeds ${videoLength}, not using it.`
      );
      this.seconds = null;
    }

    const useTimestamps = canUseInputTimestamps
      ? fillTimestamps(inputTimestamps, this.secondsApart)
      : getTimestamps(
          videoLength,
          num,
          this.seconds,
          this.secondsApart,
          this.duration,
          isSmartSetup
        );

    const width = this.width;
    let results = [];
    let l = 0;

    for (const time of useTimestamps) {
      const length = lengths ? lengths[l] : this.duration;
      const buffers = await measure('getting stills', () =>
        getFrames(input, time, Math.round(length * fps), fps, width)
      );
      const file = `${output} @ ${time.toFixed(2)}s.gif`;
      await measure(`making gif at ${time.toFixed(2)}s`, () =>
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
