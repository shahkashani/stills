module.exports = (annotation) => {
  const width = Math.abs(annotation[3][0] - annotation[1][0]);
  const height = Math.abs(annotation[4][1] - annotation[2][1]);
  const size = Math.max(width, height);
  const x = annotation[0][0];
  const y = annotation[0][1];
  return { width, height, x, y, size };
};
