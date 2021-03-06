const { execCmd, processAsStills } = require('./utils');
const { getFaces, getBoundingBox } = require('../utils/faces');

class FilterHalo {
  constructor({ scale = 3, opacity = 0.4 } = {}) {
    this.scale = scale;
    this.opacity = opacity;
  }

  get name() {
    return 'halo';
  }

  getCmd(file, points) {
    const { width, height, x, y } = getBoundingBox(points);
    const size = `x${Math.round(height * this.scale)}`;
    const pasteX = Math.round(x - (width / 2) * (this.scale - 1));
    const pasteY = Math.round(y - (height / 2) * (this.scale - 1));
    const polygon = points.map(({ x, y }) => `${x},${y}`).join(' ');

    return `\\( \\( "${file}" \\( +clone -fill black -colorize 100% -fill white -draw "polygon ${polygon}" -alpha off \\) -compose CopyOpacity -composite -matte -channel A +level 0,${
      this.opacity * 100
    }% \\) -trim +repage -resize ${size} -geometry +${pasteX}+${pasteY} \\) -compose over -composite`;
  }

  exec(file, cmd) {
    execCmd(`convert "${file}" ${cmd} "${file}"`);
  }

  async apply(file) {
    await processAsStills(file, async (png) => {
      const faces = await getFaces(png);
      if (faces.length === 0) {
        console.log('Skipping this one');
      }
      for (const face of faces) {
        this.exec(png, this.getCmd(png, face.landmarks.getJawOutline()));
      }
    });
  }
}

module.exports = FilterHalo;
