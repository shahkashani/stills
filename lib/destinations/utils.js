const imagemin = require('imagemin');
const imageminGiflossy = require('imagemin-giflossy');

const toMbStr = bytes => `${(bytes / 1000000).toPrecision(2)}MB`;

const compressToSize = async (inputBuffer, numBytes) => {
  if (inputBuffer.length <= numBytes) {
    return inputBuffer;
  }
  const rates = [1, 5, 10, 15, 20, 25, 30, 40, 50, 80, 100, 150, 200];
  let len = inputBuffer.length;
  let outputBuffer = inputBuffer;
  console.log(
    `💊 Compressing ${toMbStr(inputBuffer.length)} ⟶  ${toMbStr(numBytes)}`
  );
  for (let i = 0; i < rates.length && len > numBytes; i++) {
    outputBuffer = await imagemin.buffer(inputBuffer, {
      use: [
        imageminGiflossy({
          lossy: rates[i]
        })
      ]
    });
    len = outputBuffer.length;
    console.log(`📉 Current size: ${toMbStr(len)}`);
  }
  return outputBuffer;
};

module.exports = {
  compressToSize
};
