const { execFileSync } = require('child_process');

const getImageInfo = (file) => {
  // No shell: `file` is passed to ffprobe literally and cannot be interpreted
  // as shell syntax.
  let stdout;
  try {
    stdout = execFileSync(
      'ffprobe',
      [
        '-v',
        'quiet',
        '-print_format',
        'json',
        '-show_format',
        '-show_streams',
        file
      ],
      { encoding: 'utf8' }
    );
  } catch (err) {
    console.error(err);
    return null;
  }
  const json = JSON.parse(stdout.trim());
  const stream = json.streams[0];
  const numFrames = parseInt(stream.nb_frames || 1, 10);
  const width = stream.width;
  const height = stream.height;
  const fps = parseInt(stream.r_frame_rate.split('/')[0], 10);
  const duration = parseFloat(stream.duration);
  return { numFrames, width, height, fps, duration };
};

module.exports = getImageInfo;
