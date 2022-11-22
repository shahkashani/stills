const gm = require('gm').subClass({ imageMagick: true });

module.exports = async (buffer, { prevFrame, snapshot = null } = {}) => {
  if (!prevFrame) {
    return buffer;
  }
  const snapshotFile = prevFrame.getSnapshot(snapshot);
  if (!snapshotFile) {
    return buffer;
  }
  return new Promise((resolve, reject) => {
    gm(buffer)
      .command('convert')
      .out('(')
      .out(snapshotFile)
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
