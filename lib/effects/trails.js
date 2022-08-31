const sharp = require('../utils/sharp');

module.exports = async (buffer, { prevFrame, snapshot = null } = {}) => {
  if (!prevFrame) {
    return buffer;
  }
  const snapshotFile = prevFrame.getSnapshot(snapshot);
  if (!snapshotFile) {
    return buffer;
  }
  const foreground = await sharp(snapshotFile).ensureAlpha(0.5).toBuffer();
  return await sharp(buffer)
    .composite([{ input: foreground }])
    .removeAlpha()
    .toBuffer();
};
