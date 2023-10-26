function calculateFaceAngle(mesh) {
  const radians = (a1, a2, b1, b2) => Math.atan2(b2 - a2, b1 - a1);

  const angle = {};

  if (!mesh || !mesh._positions || mesh._positions.length !== 68) return angle;
  const pt = mesh._positions;

  // roll is face lean left/right
  // comparing x,y of outside corners of leftEye and rightEye
  angle.roll = radians(pt[36]._x, pt[36]._y, pt[45]._x, pt[45]._y);

  // yaw is face turn left/right
  // comparing x distance of bottom of nose to left and right edge of face
  //       and y distance of top    of nose to left and right edge of face
  // precision is lacking since coordinates are not precise enough
  angle.pitch = radians(
    pt[30]._x - pt[0]._x,
    pt[27]._y - pt[0]._y,
    pt[16]._x - pt[30]._x,
    pt[27]._y - pt[16]._y
  );

  // pitch is face move up/down
  // comparing size of the box around the face with top and bottom of detected landmarks
  // silly hack, but this gives us face compression on y-axis
  // e.g., tilting head up hides the forehead that doesn't have any landmarks so ratio drops
  // value is normalized to range, but is not in actual radians
  const bottom = pt.reduce(
    (prev, cur) => (prev < cur._y ? prev : cur._y),
    +Infinity
  );
  const top = pt.reduce(
    (prev, cur) => (prev > cur._y ? prev : cur._y),
    -Infinity
  );
  angle.yaw = 10 * (mesh._imgDims._height / (top - bottom) / 1.45 - 1);

  return angle;
}

module.exports = getAngle = (face) => {
  return calculateFaceAngle(face.landmarks);
};