const sharp = require('../utils/sharp');
const getSvg = require('../utils/svg');
const getBoundingBox = require('../utils/get-bounding-box');
const roundPolygon = require('../utils/round-polygon');

const PEN_STYLE = 'circle';
const OPACITY = 1;
const RESIZE = 1.5;

const mirrorImageBuffer = async (inputBuffer) => {
  const image = sharp(inputBuffer);
  const metadata = await image.metadata();
  const width = metadata.width;
  const height = metadata.height;

  if (!width || !height) {
    throw new Error('Invalid image dimensions');
  }

  const leftHalf = await image
    .extract({
      left: 0,
      top: 0,
      width: Math.ceil(width / 2),
      height: height
    })
    .toBuffer();

  const mirroredHalf = await sharp(leftHalf).flip(false).flop(true).toBuffer();

  const finalImage = await sharp({
    create: {
      width: width,
      height: height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite([
      { input: leftHalf, left: 0, top: 0 },
      { input: mirroredHalf, left: Math.floor(width / 2), top: 0 }
    ])
    .png()
    .toBuffer();

  return finalImage;
};
const mask = async (buffer, points) => {
  const box = getBoundingBox(points);
  const image = sharp(buffer);
  const { width, height } = await image.metadata();
  const SVG = await getSvg();
  const svg = SVG().size(width, height);
  svg.rect(width, height).fill('black');
  const path = roundPolygon(points, 1, PEN_STYLE);
  svg.path(path).fill(`rgba(255,255,255,${OPACITY})`);
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
  const darkBuffer = await sharp(buffer).toBuffer();
  if (faces.length === 0) {
    return darkBuffer;
  }
  const overlays = [];
  const newBuffer = await sharp(buffer).toBuffer();

  for (const face of faces) {
    const box = getBoundingBox(face.annotations.silhouette);
    const faceMask = await mask(newBuffer, face.annotations.silhouette);
    const newWidth = Math.round(box.width * RESIZE);
    const newHeight = Math.round(box.height * RESIZE);
    const faceBuffer = sharp(faceMask).resize(newWidth, newHeight, {
      fit: 'fill'
    });
    overlays.push({
      input: await faceBuffer.flip().toBuffer(),
      left: box.x - Math.round((newWidth - box.width) / 2),
      top: box.y - Math.round((newHeight - box.height) / 2)
    });
  }
  return sharp(darkBuffer).composite(overlays).removeAlpha().toBuffer();
};
