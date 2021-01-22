const { execCmd, processAsStills } = require('./utils');
const { getFaces } = require('../utils/faces');

class FilterFaceOverlay {
  constructor({ overlayFile = null, scale = 1.5, avoidDescriptors = [] } = {}) {
    this.overlayFile = Array.isArray(overlayFile) ? overlayFile : [overlayFile];
    this.scale = scale;
    this.avoidDescriptors = avoidDescriptors;
  }

  get name() {
    return 'faceoverlay';
  }

  getCmd(box, file) {
    const { x, y, width, height } = box;
    const size = `x${Math.round(height * this.scale)}`;
    const pasteX = Math.round(x - (width / 2) * (this.scale - 1));
    const pasteY = Math.round(y - (height / 2) * (this.scale - 1));

    return `-coalesce null: \\( "${file}" -resize ${size} \\) -geometry +${pasteX}+${pasteY} -layers composite`;
  }

  exec(file, cmd) {
    execCmd(`convert "${file}" ${cmd} "${file}"`);
  }

  async apply(file) {
    await processAsStills(file, async (png) => {
      const faces = await getFaces(png, this.avoidDescriptors);
      if (faces.length === 0) {
        console.log('Skipping this one');
      }
      let i = 0;
      for (const face of faces) {
        const file = this.overlayFile[i % this.overlayFile.length];
        i += 1;
        this.exec(png, this.getCmd(face.detection.box, file));
      }
    });
  }
}

module.exports = FilterFaceOverlay;
