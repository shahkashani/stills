const { exec } = require("shelljs");

const getImageInfo = file => {
  const cmd = `ffprobe -v quiet -print_format json -show_format -show_streams "${file}"`;
  const result = exec(cmd, { silent: true });
  if (result.code !== 0) {
    return null;
  }
  const json = JSON.parse(result.stdout.trim());
  const stream = json.streams[0];
  const numFrames = parseInt(stream.nb_frames || 1, 10);
  const width = stream.width;
  const height = stream.height;
  const fps = parseInt(stream.r_frame_rate.split("/")[0], 10);
  const duration = parseFloat(stream.duration);
  return { numFrames, width, height, fps, duration };
};

module.exports = getImageInfo;
