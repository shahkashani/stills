const { getFaces, getBoundingBox } = require('../utils/faces');
const { execCmd, processAsStills } = require('./utils');
const Polygon = require('polygon');
const imageOutput = require('image-output');
const { unlinkSync } = require('fs');
const { range, random } = require('lodash');

class FilterHaze {
  constructor({
    base = `-modulate 100,30 -fill "#1c0025" -colorize 90 -brightness-contrast 30x55`,
    minEyeWidth = 10,
    bodies
  } = {}) {
    this.base = base;
    this.minEyeWidth = minEyeWidth;
    this.bodies = bodies || [
      { fill: '#d909c8', opacity: 0.2, scale: 3, blur: 5 },
      { fill: 'white', opacity: 0.5, scale: 2, blur: 5 },
      { fill: 'white', opacity: 1, scale: 1.2 }
    ];
  }

  get name() {
    return 'haze';
  }

  getPadded(points, scale) {
    const p = new Polygon(points);
    p.scale(scale);
    return p.toArray();
  }

  getMask(landmarks, scale) {
    const polygons = landmarks
      .map(
        (landmark) =>
          `-draw "polygon ${this.getPadded(landmark, scale)
            .map((array) => array.join(','))
            .join(' ')}"`
      )
      .join(' ');
    return `+clone -fill black -colorize 100 -fill white ${polygons}`;
  }

  glowingEyes(png, faces) {
    const eyes = faces.reduce((memo, face) => {
      const { width: leftWidth } = getBoundingBox(face.landmarks.getLeftEye());
      const { width: rightWidth } = getBoundingBox(
        face.landmarks.getRightEye()
      );
      if (leftWidth < this.minEyeWidth || rightWidth < this.minEyeWidth) {
        return memo;
      }
      return [
        ...memo,
        face.landmarks.getLeftEye(),
        face.landmarks.getRightEye()
      ];
    }, []);
    this.bodies.forEach(({ blur, fill, opacity, scale = 1 }) => {
      const mask = this.getMask(eyes, scale);
      const o = opacity ? `-matte -channel A +level 0,${opacity * 100}%` : '';
      const b = blur ? `-blur 0x${blur}` : '';
      execCmd(
        `convert "${png}" \\( +clone -fill "${fill}" -colorize 100 \\( ${mask} \\) -alpha off -compose CopyOpacity -composite ${o} ${b} \\) -compose over -composite "${png}"`
      );
    });
  }

  getCircles(
    width,
    height,
    numPerBlock = 5,
    numBlocks = 10,
    sizeMin = 0,
    sizeMax = 1
  ) {
    const blockWidth = Math.ceil(width / numBlocks);
    const blockHeight = Math.ceil(height / numBlocks);
    const blocks = range(0, numBlocks).reduce((memo, i) => {
      range(0, numBlocks).map((j) => {
        memo.push({
          xs: [blockWidth * i, blockWidth * (i + 1)],
          ys: [blockHeight * j, blockHeight * (j + 1)]
        });
      });
      return memo;
    }, []);
    return blocks.reduce((memo, { xs, ys }) => {
      range(0, numPerBlock).map(() => {
        const x = random(xs[0], xs[1]);
        const y = random(ys[0], ys[1]);
        const size = random(sizeMin, sizeMax);
        memo.push({
          x,
          y,
          size,
          color: '#260043'
        });
      });
      return memo;
    }, []);
  }

  getCirclesString(circles) {
    return circles
      .map(({ x, y, size, color }) => {
        const ns = size + random(0, 1);
        return `-fill "${color}" -draw "circle ${x},${y} ${x},${y + ns}"`;
      })
      .join(' ');
  }

  backDrop(png, segmentation, circles) {
    const mask = `mask-${png}`;
    const draw = this.getCirclesString(circles);
    imageOutput(segmentation, mask);
    execCmd(
      `convert "${png}" \\( +clone ${draw} \\( "${mask}" \\) -alpha off -compose CopyOpacity -composite \\) -compose over -composite "${png}"`
    );
    unlinkSync(mask);
  }

  async applyFrames(frames) {
    const file = frames.file;
    const { width, height } = frames.getInfo();
    const circles = this.getCircles(width, height);

    await processAsStills(file, async (png) => {
      // const segmentation = await getBodyMap(png, 0.2);
      const faces = await getFaces(png);
      execCmd(`convert "${png}" ${this.base} "${png}"`);
      if (faces.length > 0) {
        this.glowingEyes(png, faces);
      }
      /*
      if (segmentation) {
        this.backDrop(png, segmentation, circles);
      }
      */
    });
  }
}

module.exports = FilterHaze;
