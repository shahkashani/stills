const Vips = require('wasm-vips');

let vips;

module.exports = async () => {
  if (vips) {
    return vips;
  }
  vips = await Vips();
  vips.Utils.setCacheMax(0);
  return vips;
};
