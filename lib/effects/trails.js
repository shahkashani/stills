const sharp = require('../utils/sharp');

module.exports = async (buffer, { prevFrame, snapshot = null } = {}) => {
  if (!prevFrame) {
    return buffer;
  }
  const useBuffer = prevFrame.getSnapshot(snapshot) || prevFrame.buffer;
  const foreground = await sharp(useBuffer).ensureAlpha(0.5).toBuffer();
  return await sharp(buffer)
    .composite([{ input: foreground }])
    .removeAlpha()
    .toBuffer();
};
