module.exports = (pts, padding = 0) => {
  const xs = pts.map(function (pt) {
    return pt.x;
  });
  const ys = pts.map(function (pt) {
    return pt.y;
  });

  const x = xs.reduce(function (min, x) {
    return x < min ? x : min;
  }, Infinity);

  const y = ys.reduce(function (min, y) {
    return y < min ? y : min;
  }, Infinity);

  const width =
    xs.reduce(function (max, x) {
      return max < x ? x : max;
    }, 0) - x;

  const height =
    ys.reduce(function (max, y) {
      return max < y ? y : max;
    }, 0) - y;

  const paddingX = padding / 2;
  const paddingY = padding / 2;

  return {
    x: Math.round(x - paddingX),
    y: Math.round(y - paddingY),
    width: Math.round(width + paddingX * 2),
    height: Math.round(height + paddingY * 2)
  };
};
