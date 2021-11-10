const { transformFrames, execCmd } = require('./utils');
const getScenes = require('../../lib/utils/get-scenes');

class FilterRepeatFrame {
  constructor({ delay = null, useScenes = true } = {}) {
    this.delay = delay;
    this.useScenes = useScenes;
  }

  get name() {
    return 'repeatframe';
  }

  async applyFrames(frames) {
    const file = frames.file;
    const scenes = this.useScenes ? await getScenes(file) : null;
    await transformFrames(file, null, false, (image) => {
      let start = 0;
      let end = image.frames.length - 1;
      if (scenes && scenes.last) {
        start = scenes.last[0];
        end = scenes.last[1];
      }
      for (let i = start; i <= end; i += 2) {
        image.frames[i] = image.frames[start];
      }
      return image;
    });
    if (this.delay) {
      execCmd(`convert -delay ${this.delay} "${file}" "${file}"`);
    }
  }
}

module.exports = FilterRepeatFrame;
