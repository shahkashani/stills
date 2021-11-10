const { fileToFrames, framesToFile } = require('./utils');

class FilterMorph {
  constructor({ morphFile, morphRate = 0.5, isFade = false } = {}) {
    this.morphFile = morphFile;
    this.isFade = isFade;
    this.morphRate = morphRate;
  }

  get name() {
    return 'morph';
  }

  transform(base, frame, mix) {
    const buf = Buffer.alloc(base.length);
    for (let j = 0; j < buf.length; j++) {
      buf[j] = frame[j] * mix + base[j] * (1 - mix);
    }
    return buf;
  }

  getOpacities(num) {
    const chunkLengths = 5;
    const fades = [0.25, 0.5, 1, 0.5, 0.25];
    const regulars = [0, 0, 0, 0, 0];
    const result = [];
    const batches = Math.ceil(num / chunkLengths);
    for (let i = 0; i < batches; i += 1) {
      result.push.apply(
        result,
        Math.random() > this.morphRate ? regulars : fades
      );
    }
    return result.slice(0, num);
  }

  async applyFrames(frames) {
    const file = frames.file;
    const morphFrames = await fileToFrames(this.morphFile);
    const inputFrames = await fileToFrames(file);
    const numFrames = inputFrames.frames.length;
    const opacities = this.getOpacities(numFrames);

    for (let i = 0; i < numFrames; i++) {
      const inputFrame = inputFrames.frames[i].data;
      const morphFrame = morphFrames.frames[i].data;
      if (this.isFade) {
        inputFrames.frames[i].data = this.transform(
          inputFrame,
          morphFrame,
          opacities[i]
        );
      } else {
        inputFrames.frames[i].data =
          Math.random() > this.morphRate ? inputFrame : morphFrame;
      }
    }

    await framesToFile(inputFrames, file);
  }
}

module.exports = FilterMorph;
