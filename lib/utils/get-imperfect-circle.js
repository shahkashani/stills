function setLinePoints(iterations) {
  let pointList = {};
  pointList.first = { x: 0, y: 1 };
  let lastPoint = { x: 1, y: 1 };
  let minY = 1;
  let maxY = 1;
  let point;
  let nextPoint;
  let dx, newX, newY;

  pointList.first.next = lastPoint;
  for (let i = 0; i < iterations; i++) {
    point = pointList.first;
    while (point.next != null) {
      nextPoint = point.next;
      dx = nextPoint.x - point.x;
      newX = 0.5 * (point.x + nextPoint.x);
      newY = 0.5 * (point.y + nextPoint.y);
      newY += dx * (Math.random() * 2 - 1);
      let newPoint = { x: newX, y: newY };
      if (newY < minY) {
        minY = newY;
      } else if (newY > maxY) {
        maxY = newY;
      }
      newPoint.next = nextPoint;
      point.next = newPoint;
      point = nextPoint;
    }
  }

  if (maxY != minY) {
    let normalizeRate = 1 / (maxY - minY);
    point = pointList.first;
    while (point != null) {
      point.y = normalizeRate * (point.y - minY);
      point = point.next;
    }
  } else {
    point = pointList.first;
    while (point != null) {
      point.y = 1;
      point = point.next;
    }
  }

  return pointList;
}

module.exports = (
  centerX,
  centerY,
  minRad,
  maxRad,
  isReturnArray,
  pieces = 9,
  phase = Math.random() * Math.PI * 2
) => {
  let point;
  let rad, theta;
  let twoPi = 2 * Math.PI;
  let x0, y0;
  let pointList = setLinePoints(pieces);

  point = pointList.first;
  theta = phase;
  rad = minRad + point.y * (maxRad - minRad);
  x0 = centerX + rad * Math.cos(theta);
  y0 = centerY + rad * Math.sin(theta);

  const points = [{ x: x0, y: y0 }];

  while (point.next != null) {
    point = point.next;
    theta = twoPi * point.x + phase;
    rad = minRad + point.y * (maxRad - minRad);
    x0 = centerX + rad * Math.cos(theta);
    y0 = centerY + rad * Math.sin(theta);
    points.push({ x: x0, y: y0 });
  }
  return isReturnArray
    ? points
    : `polygon ${points.map(({ x, y }) => `${x},${y}`).join(' ')}`;
};
