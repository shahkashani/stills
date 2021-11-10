const {
  transformFrames,
  processAsStills,
  getRawDrawCommand,
  execCmd
} = require('./utils');
const { getFaces, getBoundingBox, fillFaces } = require('../utils/faces');

class FilterArcadia {
  constructor({
    fill = '#222b6d',
    colorize = 20,
    modulate = '135,10,100',
    gamma = 0.5,
    blur = '0x10',
    blurOpacity = 0.5,
    contrastStretch = '25%x0.05%',
    isBoonme = true,
    isTrails = true,
    isDesaturate = true,
    boonmeFill = '#eeeeee',
    isFillFaces = false
  } = {}) {
    this.fill = fill;
    this.colorize = colorize;
    this.gamma = gamma;
    this.blur = blur;
    this.blurOpacity = blurOpacity;
    this.modulate = modulate;
    this.contrastStretch = contrastStretch;
    this.isBoonme = isBoonme;
    this.boonmeFill = boonmeFill;
    this.isTrails = isTrails;
    this.isDesaturate = isDesaturate;
    this.isFillFaces = isFillFaces;
  }

  get name() {
    return 'arcadia';
  }

  getOutlineCmd(file, points) {
    const { width, x, y } = getBoundingBox(points);
    const blur = Math.ceil(width * 0.1);
    const polygon = points.map(({ x, y }) => `${x},${y}`).join(' ');

    const maskBlur = `-blur 0x${blur}`;

    const mask1 = `\\( +clone -threshold 100% -fill white -draw "polygon ${polygon}" ${maskBlur} \\) -channel-fx '| gray=>alpha'`;
    const mask2 = `\\( +clone -threshold 100% -fill white -draw "polygon ${polygon}" ${maskBlur} -distort ScaleRotateTranslate '${
      x + width / 2
    },${y} 1 180' \\) -channel-fx '| gray=>alpha'`;
    const effect = `-modulate -1000%,0`;

    return `\\( "${file}" ${mask1} ${effect} -trim -alpha deactivate \\) \\( "${file}" ${mask2} ${effect} -trim -alpha deactivate \\)`;
  }

  getFeaturesCmd(file, pointSet, size) {
    const { x, y } = getBoundingBox(pointSet);
    const startX = x + size / 2;
    const startY = y + size / 2;
    return getRawDrawCommand(
      file,
      `-draw 'circle ${startX},${startY} ${startX},${startY + size}'`,
      {
        fill: this.boonmeFill,
        effects: `-blur 0x${size * 0.15}`
      }
    );
  }

  transform(base, frame) {
    const buf = Buffer.alloc(base.length);
    for (let j = 0; j < buf.length; j++) {
      buf[j] = frame[j] * 0.5 + base[j] * 0.5;
    }
    return buf;
  }

  async applyFrames(frames) {
    const file = frames.file;
    let facesPerFrames = {};

    await processAsStills(
      file,
      async (png, _p, index) => {
        const faces = facesPerFrames[index] || [];
        const masks = faces.map((face) =>
          this.getOutlineCmd(png, face.landmarks.getJawOutline())
        );
        execCmd(`convert "${png}" ${masks.join(' ')} -flatten "${png}"`);
      },
      async (png, progress, index) => {
        if (this.isBoonme) {
          facesPerFrames[index] = await getFaces(png);
        }
        if (progress === 1 && this.isFillFaces) {
          facesPerFrames = fillFaces(facesPerFrames);
        }
      }
    );

    if (this.isTrails) {
      await transformFrames(file, this.transform, false, (image) => image);
    }
    await processAsStills(file, async (png, _p, index) => {
      execCmd(
        `convert "${png}" -coalesce null: \\( -clone 0 -filter Gaussian -blur ${
          this.blur
        } -matte -channel A +level 0,${
          this.blurOpacity * 100
        }% \\) -gravity center -layers composite "${png}"`
      );
      const faces = facesPerFrames[index] || [];
      for (const face of faces) {
        const bounds = getBoundingBox(face.landmarks.getLeftEye());
        const size = Math.min(bounds.width, bounds.height);
        execCmd(this.getFeaturesCmd(png, face.landmarks.getLeftEye(), size));
        execCmd(this.getFeaturesCmd(png, face.landmarks.getRightEye(), size));
      }
    });
    if (this.isDesaturate) {
      execCmd(
        `convert "${file}" -modulate ${this.modulate} -fill '${this.fill}' -colorize ${this.colorize} -gamma ${this.gamma} -contrast-stretch ${this.contrastStretch} "${file}"`
      );
    }
  }
}

module.exports = FilterArcadia;
