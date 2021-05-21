const { compact } = require('lodash');
const { getAsStills } = require('../../filters/utils');

const validateFrames = async ({ image, gifThreshold, validationFn }) => {
  const [files, deleteFiles] = getAsStills(image);
  const frames = files.length;
  const promises = files.map(validationFn);
  const results = await Promise.all(promises);
  const matchedFrames = compact(results).length;
  const numRequired = frames > 1 ? Math.floor(frames * gifThreshold) : 1;
  console.log(`🧐 Matched ${matchedFrames} (of required ${numRequired})`);
  deleteFiles();
  return matchedFrames >= numRequired;
};

module.exports = validateFrames;
