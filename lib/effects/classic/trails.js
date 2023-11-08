const gm = require('gm').subClass({ imageMagick: true });

module.exports = async (buffer, { prevFrame, snapshot = null } = {}) => {
  if (!prevFrame) {
    return buffer;
  }
  // I don't think this will actually work
  const snapshotBuffer = prevFrame.getSnapshot(snapshot);
  if (!snapshotBuffer) {
    return buffer;
  }
  return new Promise((resolve, reject) => {
    gm(buffer)
      .command('convert')
      .out('(')
      .out(snapshotBuffer)
      .out(')')
      .out('-evaluate-sequence', 'mean')
      .out('-alpha', 'off')
      .toBuffer('PNG', (err, buffer) => {
        if (err) {
          return reject(err);
        }
        resolve(buffer);
      });
  });
};
