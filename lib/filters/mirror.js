const { execCmd, processAsStills, getFrameRange } = require('./utils');

class FilterMirror {
  constructor({ useMidpoint = true } = {}) {
    this.useMidpoint = useMidpoint;
  }

  get name() {
    return 'mirror';
  }

  async applyFrames(frames) {
    const file = frames.file;
    const { width, height, numFrames } = frames.getInfo();
    const useMidpoint = this.useMidpoint && numFrames > 1;
    let start;
    let end;
    if (useMidpoint) {
      const [a, b] = await getFrameRange(file);
      start = a;
      end = b;
    }
    const newWidth = width / 2;
    await processAsStills(file, async (png, _progress, i) => {
      if ((useMidpoint && i < start) || i > end) {
        return;
      }
      execCmd(
        `convert "${png}" \\( -clone 0 -crop ${newWidth}x${height}+0+0 -flop -repage +0+0\\! \\) -flatten "${png}"`
      );
    });
  }
}

module.exports = FilterMirror;
