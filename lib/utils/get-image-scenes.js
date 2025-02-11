const PNG = require('pngjs').PNG;
const pixelmatch = require('pixelmatch');
const sharp = require('../utils/sharp');

const getImageScenes = async (
  image,
  threshold = 0.1,
  percentDifferent = 0.5
) => {
  const frames = image.getFrames();
  const diffs = [];
  const width = 320;
  const height = 200;

  for (let i = 0; i < frames.length - 1; i += 1) {
    const a = await sharp(frames[i].buffer).resize(width, height).toBuffer();
    const b = await sharp(frames[i + 1].buffer)
      .resize(width, height)
      .toBuffer();
    let img1;
    let img2;
    let valid = false;
    let attempts = 0;
    while (!valid && attempts < 10) {
      try {
        img1 = PNG.sync.read(a);
        img2 = PNG.sync.read(b);
        valid = true;
      } catch (err) {
        console.log('🔻 Problem reading images', err);
        valid = false;
        attempts += 1;
      }
    }

    if (!img1) {
      console.log('🔻 Could not read image in the end', a);
    }

    if (!img2) {
      console.log('🔻 Could not read image in the end', b);
    }

    if (!img1 || !img2) {
      return 0;
    }

    const diff = pixelmatch(img1.data, img2.data, null, width, height, {
      threshold
    });

    diffs.push(diff / (width * height));
  }

  const scenes = [];
  let currents = [];
  for (let i = 0; i < frames.length; i += 1) {
    currents.push(i);
    if (i in diffs && diffs[i] > percentDifferent) {
      scenes.push([...currents]);
      currents.length = 0;
    }
  }
  if (currents.length > 0) {
    scenes.push([...currents]);
  }
  return scenes;
};

module.exports = getImageScenes;
