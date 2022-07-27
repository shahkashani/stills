const fs = require('fs');
const PNG = require('pngjs').PNG;
const pixelmatch = require('pixelmatch');
const { range } = require('lodash');

const getImageScenes = async (
  image,
  threshold = 0.1,
  percentDifferent = 0.5
) => {
  const frames = image.getFrames();
  const { width, height } = image.getInfo();
  const diffs = range(0, frames.length - 1).map((i) => {
    const a = frames[i].original;
    const b = frames[i + 1].original;
    const img1 = PNG.sync.read(fs.readFileSync(a));
    const img2 = PNG.sync.read(fs.readFileSync(b));
    const diff = pixelmatch(img1.data, img2.data, null, width, height, {
      threshold
    });
    return diff / (width * height);
  });

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
