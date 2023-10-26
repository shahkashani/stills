const Polygon = require('polygon');
const { exec } = require('../effects');
const getBoundingBox = require('../utils/get-bounding-box');

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

  glowingEyes(frame, faces) {
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
      exec(
        frame,
        `\\( +clone -fill "${fill}" -colorize 100 \\( ${mask} \\) -alpha off -compose CopyOpacity -composite ${o} ${b} \\) -compose over -composite`
      );
    });
  }

  async applyFrame(frame) {
    const faces = await frame.getFaces();
    exec(frame, this.base);
    if (faces.length > 0) {
      this.glowingEyes(frame, faces);
    }
  }
}

module.exports = FilterHaze;
