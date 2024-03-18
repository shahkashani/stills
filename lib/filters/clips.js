const sharp = require('../utils/sharp');
const getFrames = require('../content/utils/get-frames');
const { getVideoLength } = require('../content/utils');

class FilterClips {
  constructor({ source, fit = 'contain' }) {
    this.source = source;
    this.fit = fit;
  }

  get name() {
    return 'clips';
  }

  async setup({ image }) {
    const { width, height } = await image.getInfo();
    const clip = await this.source.get();
    const clipLength = getVideoLength(clip.input);
    const seconds = Math.round(Math.random() * clipLength * 0.9);
    const scenes = await image.getScenes();
    const scene = scenes[scenes.length - 1];
    const buffers = await getFrames(clip.input, seconds, scene.length);
    const resized = buffers.map((buffer) =>
      sharp(buffer).resize(width, height, {
        background: 'transparent',
        fit: this.fit
      })
    );
    let i = 0;
    const frames = image.getFrames();
    for (const frame of scene) {
      frames[frame].buffer = await resized[i].toBuffer();
      i += 1;
    }
  }
}

module.exports = FilterClips;
