const execCmd = require('../utils/exec-cmd');

module.exports = async (frame, { prevFrame, snapshot = null } = {}) => {
  if (prevFrame) {
    execCmd(
      `convert "${frame.file}" \\( "${prevFrame.getSnapshot(
        snapshot
      )}" \\) -evaluate-sequence mean -alpha off "${frame.file}"`
    );
  }
};
