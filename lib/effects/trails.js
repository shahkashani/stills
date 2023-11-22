const sharp = require('../utils/sharp');

module.exports = async (
  buffer,
  { prevFrame, alpha = 0.5, snapshot = null, overlayBuffer = null } = {}
) => {
  if (!prevFrame && !overlayBuffer) {
    return buffer;
  }
  const useBuffer =
    overlayBuffer || prevFrame.getSnapshot(snapshot) || prevFrame.buffer;
  const foreground = await sharp(useBuffer).ensureAlpha(alpha).toBuffer();
  return await sharp(buffer)
    .composite([{ input: foreground }])
    .removeAlpha()
    .toBuffer();
};
