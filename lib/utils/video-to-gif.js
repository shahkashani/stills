const { exec } = require("shelljs");
const getImageInfo = require("./get-image-info");

function getWidth(input, desiredWidth, desiredHeight) {
  if (!desiredHeight) {
    return desiredWidth;
  }
  const { width, height } = getImageInfo(input);
  const newHeight = (desiredWidth / width) * height;
  return newHeight < desiredHeight ? Math.ceil(width / (height / desiredHeight)) : desiredWidth;
}

function videoToGif(
  input,
  output,
  fps,
  duration,
  desiredWidth,
  desiredHeight = null,
  start = 0
) {
  const width = getWidth(input, desiredWidth, desiredHeight);
  const cmd = `ffmpeg -ss ${start} -t ${duration} -i "${input}" -v warning -filter_complex "[0:v] fps=${fps},scale=${width}:${width}/dar,split [a][b];[a] palettegen=reserve_transparent=off:stats_mode=single [p];[b][p] paletteuse=new=1"  -y "${output}"`;
  const result = exec(cmd, { silent: true });
  if (result.code !== 0) {
    return null;
  }
  if (desiredHeight) {
    const cmd2 = `convert "${output}" -gravity center -extent ${desiredWidth}x${desiredHeight} "${output}"`;
    const result2 = exec(cmd2, { silent: true });
    if (result2.code !== 0) {
      return null;
    }
  }
  return output;
}

module.exports = videoToGif;
