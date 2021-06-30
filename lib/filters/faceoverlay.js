const { execCmd, processAsStills, getAsStills } = require('./utils');
const { getFaces } = require('../utils/faces');

class FilterFaceOverlay {
  constructor({
    overlayFile = null,
    scale = 1.5,
    offset = null,
    avoidDescriptors = []
  } = {}) {
    this.overlayFile = Array.isArray(overlayFile) ? overlayFile : [overlayFile];
    this.scale = scale;
    this.offset = offset;
    this.avoidDescriptors = avoidDescriptors;
  }

  get name() {
    return 'faceoverlay';
  }

  getCmd(box, file) {
    const { x, y, width, height } = box;
    let offsetX = 0;
    let offsetY = 0;
    if (this.offset) {
      const [strX, strY] = (this.offset || '').split(',');
      offsetX =
        strX.indexOf('px') !== -1 ? parseInt(strX) : width * parseFloat(strX);
      if (strY) {
        offsetY = height * parseFloat(strY);
      }
    }
    const size = `x${Math.round(height * this.scale)}`;
    const pasteX = Math.round(x - (width / 2) * (this.scale - 1)) + offsetX;
    const pasteY = Math.round(y - (height / 2) * (this.scale - 1)) + offsetY;

    return `-coalesce null: \\( "${file}" -resize ${size} \\) -geometry +${pasteX}+${pasteY} -layers composite`;
  }

  exec(file, cmd) {
    execCmd(`convert "${file}" ${cmd} "${file}"`);
  }

  async apply(file) {
    const overlays = this.overlayFile.map((file) => getAsStills(file));
    await processAsStills(file, async (png, _progress, index) => {
      const faces = await getFaces(png, this.avoidDescriptors);
      if (faces.length === 0) {
        console.log('Skipping this one');
      }
      let i = 0;
      for (const face of faces) {
        const [_f, _d, _c, getAt] = overlays[i % this.overlayFile.length];
        const file = getAt(index);
        i += 1;
        this.exec(png, this.getCmd(face.detection.box, file));
      }
    });
    overlays.forEach(([_f, deleteFiles]) => deleteFiles());
  }
}

module.exports = FilterFaceOverlay;
