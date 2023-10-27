const { chunk } = require('lodash');

const SPLIT_BY = /^\s*$/;

module.exports = getTextBlocks = (
  text,
  minLineLength = 2,
  minBlockLength = 2,
  maxBlockLength = 10,
  breakLargeBlocksInto = 3
) => {
  const array = Array.isArray(text) ? text : text.trim().split(/\n/);
  const result = [];
  let currentStack = [];
  array.forEach((line) => {
    if (SPLIT_BY.test(line) || line.length <= minLineLength) {
      if (currentStack.length > 0) {
        result.push(currentStack);
      }
      currentStack = [];
    } else {
      currentStack.push(line);
    }
  });
  if (currentStack.length > 0) {
    result.push(currentStack);
  }

  if (Number.isFinite(breakLargeBlocksInto)) {
    result
      .filter((block) => block.length > maxBlockLength)
      .forEach((block) => {
        chunk(block, breakLargeBlocksInto).forEach((chunk) =>
          result.push(chunk)
        );
      });
  }

  return result.filter(
    (block) => block.length >= minBlockLength && block.length <= maxBlockLength
  );
};
