const { execCmd, getProgressiveCmd } = require("./utils");

class FilterTile {
  constructor({ numTiles = 6 } = {}) {
    this.numTiles = numTiles;
  }

  get name() {
    return "tile";
  }

  async apply(file, getImageInfo) {
    const { numFrames, width, height } = getImageInfo(file);
    const cmd = getProgressiveCmd(0, numFrames - 1, numFrames, progress => {
      const tiles = Math.ceil(progress * this.numTiles);
      const tileWidth = width / tiles;
      const tileHeight = height / tiles;
      return tiles > 1
        ? `-resize "${tileWidth}x${tileHeight}!" -write mpr:tile +delete -size ${width}x${height} tile:mpr:tile`
        : "";
    });
    execCmd(`convert "${file}" ${cmd} "${file}"`);
  }
}

module.exports = FilterTile;
