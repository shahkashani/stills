const { execCmd, processAsStills } = require('./utils');

class FilterMirror {
  get name() {
    return 'mirror';
  }

  async apply(file, getImageInfo) {
    const { width, height } = getImageInfo();
    const newWidth = width / 2;    
    await processAsStills(file, async png => {
      execCmd(`convert "${png}" \\( -clone 0 -crop ${newWidth}x${height}+0+0 -flop -repage +0+0\\! \\) -flatten "${png}"`);
    });
  }
}

module.exports = FilterMirror;
