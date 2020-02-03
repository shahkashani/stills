const { exec } = require("shelljs");

function videoToGif(input, output, fps, duration, width, height, start = 0) {
  const cmd = `ffmpeg -ss ${start} -t ${duration} -i "${input}" -v warning -filter_complex "[0:v] fps=${fps},scale=${width}:${width}/dar,split [a][b];[a] palettegen=reserve_transparent=off:stats_mode=single [p];[b][p] paletteuse=new=1"  -y "${output}"`;
  const result = exec(cmd, { silent: true });
  if (result.code !== 0) {
    return null;
  }
  if (height) {
    const cmd2 = `convert "${output}" -gravity center -extent ${width}x${height} "${output}"`;
    const result2 = exec(cmd2, { silent: true });
    if (result2.code !== 0) {
      return null;
    }
  }
  return output;
}

module.exports = videoToGif;
