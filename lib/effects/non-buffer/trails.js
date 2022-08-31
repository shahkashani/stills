const { execSync } = require('child_process');

module.exports = async (frame, { prevFrame, snapshot = null } = {}) => {
  if (prevFrame) {
    const snapshotFile = prevFrame.getSnapshot(snapshot);
    if (snapshotFile) {
      execSync(
        `convert "${frame.file}" \\( "${snapshotFile}" \\) -evaluate-sequence mean -alpha off "${frame.file}"`
      );
    }
  }
};
