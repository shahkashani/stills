const sharp = require('../utils/sharp');
const getSvg = require('../utils/svg');
const getBoundingBox = require('../utils/get-bounding-box');
const roundPolygon = require('../utils/round-polygon');

const PEN_STYLE = 'circle';

const mask = async (buffer, points) => {
  const box = getBoundingBox(points);
  const image = sharp(buffer);
  const { width, height } = await image.metadata();
  const SVG = await getSvg();
  const svg = SVG().size(width, height);
  svg.rect(width, height).fill('black');
  const path = roundPolygon(points, 1000, PEN_STYLE);
  svg.path(path).fill('white');
  const mask = await sharp(Buffer.from(svg.svg())).toBuffer();

  const masked = await image.flatten().joinChannel(mask).toBuffer();

  return await sharp(masked)
    .extract({
      width: box.width,
      height: box.height,
      top: box.y,
      left: box.x
    })
    .toBuffer();
};

module.exports = async (buffer, frame) => {
  const result = await frame.detectHumans();
  const faces = result.face;
  if (faces.length === 0) {
    return buffer;
  }
  const overlays = [];

  const newBuffer = await sharp(buffer).toBuffer();
  for (const face of faces) {
    const box = getBoundingBox(face.annotations.silhouette);
    const faceMask = await mask(newBuffer, face.annotations.silhouette);
    const newWidth = Math.round(box.width * 1);
    const newHeight = Math.round(box.height * 1);
    const faceBuffer = sharp(faceMask).resize(newWidth, newHeight);
    overlays.push({
      input: await faceBuffer.flip().toBuffer(),
      left: box.x - Math.round((newWidth - box.width) / 2),
      top: box.y - Math.round((newHeight - box.height) / 2)
    });
  }

  return sharp(buffer).composite(overlays).removeAlpha().toBuffer();
};
