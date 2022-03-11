const execCmd = require('../utils/exec-cmd');

module.exports = async (frame, { prevFrame, snapshot = null } = {}) => {
  if (prevFrame) {
    const snapshotFile = prevFrame.getSnapshot(snapshot);
    if (snapshotFile) {
      execCmd(
        `convert "${frame.file}" \\( "${snapshotFile}" \\) -evaluate-sequence mean -alpha off "${frame.file}"`
      );
    }
  }
};
