const matchHeight = (
  { width, height },
  { width: replaceWidth, height: replaceHeight }
) => {
  const replaceRatio = replaceWidth / replaceHeight;
  const newWidth = Math.ceil(width * replaceRatio);
  if (newWidth === width) {
    return {
      width,
      height
    };
  }
  if (newWidth < width) {
    return null;
  }
  return {
    width: newWidth,
    height,
    crop: `${width}x${height}`
  };
};

const matchWidth = (
  { width, height },
  { width: replaceWidth, height: replaceHeight }
) => {
  const replaceRatio = replaceWidth / replaceHeight;
  const newHeight = Math.ceil(width / replaceRatio);
  if (newHeight === height) {
    return {
      width,
      height
    };
  }
  if (newHeight < height) {
    return null;
  }
  return {
    width,
    height: newHeight,
    crop: `${width}x${height}`
  };
};

module.exports = matchImageSize = (sizes, newSizes) => {
  if (sizes.width === newSizes.width && sizes.height === sizes.height) {
    return null;
  }
  return matchWidth(sizes, newSizes) || matchHeight(sizes, newSizes);
};
