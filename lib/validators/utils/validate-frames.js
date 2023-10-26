const { compact } = require('lodash');
const Image = require('../../stills/image');

const validateFrames = async ({
  image: filename,
  gifThreshold,
  validationFn
}) => {
  const image = new Image({ filename });
  await image.prepare();
  const frames = image.getFrames();
  const promises = frames.map(validationFn);
  const results = await Promise.all(promises);
  const matchedFrames = compact(results).length;
  const numRequired =
    frames.length > 1 ? Math.floor(frames.length * gifThreshold) : 1;
  console.log(`🧐 Matched ${matchedFrames} (of required ${numRequired})`);
  image.delete(true);
  return matchedFrames >= numRequired;
};

module.exports = validateFrames;
