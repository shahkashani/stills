module.exports = getTextBlocks = (
  text,
  splitBy = /^\s*$/,
  minLineLength = 2,
  minBlockLength = 2,
  maxBlockLength = 10
) => {
  const array = Array.isArray(text) ? text : text.trim().split(/\n/);
  const result = [];
  let currentStack = [];
  array.forEach((line) => {
    if (splitBy.test(line) || line.length <= minLineLength) {
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
  return result.filter(
    (block) => block.length >= minBlockLength && block.length <= maxBlockLength
  );
};
