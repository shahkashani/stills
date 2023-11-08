const sharp = require('../utils/sharp');

module.exports = async (buffer, { prevFrame, snapshot = null } = {}) => {
  if (!prevFrame) {
    return buffer;
  }
  const snapshotBuffer = prevFrame.getSnapshot(snapshot);
  if (!snapshotBuffer) {
    return buffer;
  }
  const foreground = await sharp(snapshotBuffer).ensureAlpha(0.5).toBuffer();
  return await sharp(buffer)
    .composite([{ input: foreground }])
    .removeAlpha()
    .toBuffer();
};
