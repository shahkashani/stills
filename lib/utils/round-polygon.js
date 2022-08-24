function rotate(point, center, radians) {
  const cos = Math.cos(radians),
    sin = Math.sin(radians),
    nx = cos * (point.x - center.x) + sin * (point.y - center.y) + center.x,
    ny = cos * (point.y - center.y) - sin * (point.x - center.x) + center.y;
  return { x: nx, y: ny };
}

function limitPrecision(num, precision = 2) {
  return Math.round(num * 10 ** precision) / 10 ** precision;
}

function vec(p1, p2) {
  // Returns a ( p1 o-> p2 ) vector object
  // given p1 and p2 objects with the shape {x: number, y: number}

  // horizontal and vertical vector components
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;

  // magnitude of the vector (distance)
  const mag = Math.hypot(dx, dy);

  // unit vector
  const unit = mag !== 0 ? { x: dx / mag, y: dy / mag } : { x: 0, y: 0 };

  // normal vector
  const normal = rotate(unit, { x: 0, y: 0 }, Math.PI / 2);

  // Angle in radians
  const radians = Math.atan2(dy, dx);
  // Normalize to clock-wise circle
  const normalized = 2 * Math.PI + (Math.round(radians) % (2 * Math.PI));
  // Angle in degrees
  const degrees = (180 * radians) / Math.PI;
  const degreesNormalized = (360 + Math.round(degrees)) % 360;
  // const degrees2 = ( 360 + Math.round(degrees) ) % 360;

  return {
    dx,
    dy,
    mag,
    unit,
    normal,
    p1: { ...p1 },
    p2: { ...p2 },
    angle: {
      radians,
      normalized,
      degrees,
      degreesNormalized
    }
  };
}

module.exports = (pathData, radius, style) => {
  if (!pathData || radius === 0) {
    return pathData;
  }

  // Get path coordinates as array of {x, y} objects
  const pathCoords = pathData.map((p) => ({ x: p[0], y: p[1] }));

  // Build rounded path
  const path = [];
  for (let i = 0; i < pathCoords.length; i++) {
    // Get current point and the next two (start, corner, end)
    const c2Index = (i + 1) % pathCoords.length;
    const c3Index = (i + 2) % pathCoords.length;

    const c1 = pathCoords[i];
    const c2 = pathCoords[c2Index];
    const c3 = pathCoords[c3Index];

    // Vectors from middle point (c2) to each ends
    const vC1c2 = vec(c2, c1);
    const vC3c2 = vec(c2, c3);

    const angle = Math.abs(
      Math.atan2(
        vC1c2.dx * vC3c2.dy - vC1c2.dy * vC3c2.dx, // cross product
        vC1c2.dx * vC3c2.dx + vC1c2.dy * vC3c2.dy // dot product
      )
    );

    // Limit radius to 1/2 the shortest edge length to:
    // 1. allow rounding the next corner as much as the
    //    one we're dealing with right now (the 1/2 part)
    // 2. draw part of a circle and not an ellipse, hence
    //    we keep the shortest edge of the two
    const cornerLength = Math.min(radius, vC1c2.mag / 2, vC3c2.mag / 2);

    // Find out tangential circle radius
    const bc = cornerLength;
    const bd = Math.cos(angle / 2) * bc;
    const fd = Math.sin(angle / 2) * bd;
    const bf = Math.cos(angle / 2) * bd; // simplify from abs(cos(PI - angle / 2))
    const ce = fd / (bf / bc);
    const be = bd / (bf / bc);
    const a = ce;

    // Compute control point distance to create a circle
    // with quadratic bezier curves
    const numberOfPointsInCircle = (2 * Math.PI) / (Math.PI - angle);
    let idealControlPointDistance;

    if (style === 'circle') {
      // Strictly geometric
      idealControlPointDistance =
        (4 / 3) * Math.tan(Math.PI / (2 * numberOfPointsInCircle)) * a;
    } else if (style === 'approx') {
      // Serendipity #1 rounds the shape more naturally
      idealControlPointDistance =
        (4 / 3) *
        Math.tan(Math.PI / (2 * ((2 * Math.PI) / angle))) *
        cornerLength *
        (angle < Math.PI / 2 ? 1 + Math.cos(angle) : 2 - Math.sin(angle));
    } else if (style === 'hand') {
      // Serendipity #2 'hands free' style
      idealControlPointDistance =
        (4 / 3) *
        Math.tan(Math.PI / (2 * ((2 * Math.PI) / angle))) *
        cornerLength *
        (2 + Math.sin(angle));
    }

    // First point and control point
    const cpDistance = cornerLength - idealControlPointDistance;

    // Start of the curve
    let c1c2curvePoint = {
      x: c2.x + vC1c2.unit.x * cornerLength,
      y: c2.y + vC1c2.unit.y * cornerLength
    };
    // First control point
    let c1c2curveCP = {
      x: c2.x + vC1c2.unit.x * cpDistance,
      y: c2.y + vC1c2.unit.y * cpDistance
    };

    // Second point and control point
    // End of the curve
    let c3c2curvePoint = {
      x: c2.x + vC3c2.unit.x * cornerLength,
      y: c2.y + vC3c2.unit.y * cornerLength
    };
    // Second control point
    let c3c2curveCP = {
      x: c2.x + vC3c2.unit.x * cpDistance,
      y: c2.y + vC3c2.unit.y * cpDistance
    };

    // Limit floating point precision
    const limit = (point) => ({
      x: limitPrecision(point.x, 3),
      y: limitPrecision(point.y, 3)
    });

    c1c2curvePoint = limit(c1c2curvePoint);
    c1c2curveCP = limit(c1c2curveCP);
    c3c2curvePoint = limit(c3c2curvePoint);
    c3c2curveCP = limit(c3c2curveCP);

    // If at last coordinate of polygon, use the end of the curve as
    // the polygon starting point
    if (i === pathCoords.length - 1) {
      path.unshift(`M ${c3c2curvePoint.x} ${c3c2curvePoint.y}`);
    }

    // Draw line from previous point to the start of the curve
    path.push(`L ${c1c2curvePoint.x} ${c1c2curvePoint.y}`);

    // Cubic bezier to draw the actual curve
    path.push(
      `C ${c1c2curveCP.x} ${c1c2curveCP.y}, ${c3c2curveCP.x} ${c3c2curveCP.y}, ${c3c2curvePoint.x} ${c3c2curvePoint.y}`
    );
  }

  // Close path
  path.push('Z');

  return path.join(' ');
};
