const ffmpeg = require('fluent-ffmpeg');
const indexOf = require('knuth-morris-pratt');
const noop = () => {};
const IEND = [73, 69, 78, 68, 174, 66, 96, 130];

const getFrames = async (
  url,
  seconds,
  numFrames = 24,
  fps = 12,
  width = 1280
) => {
  const buffers = [];
  const images = [];
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(url)
      .inputOptions(['-ss', seconds])
      .output({
        writable: true,
        write: (data) => {
          const result = indexOf(IEND, data);
          if (result !== -1) {
            const current = data.slice(0, result + IEND.length);
            buffers.push(current);
            images.push(Buffer.concat(buffers));
            buffers.length = 0;
            buffers.push(data.slice(result + IEND.length));
          } else {
            buffers.push(data);
          }
        },
        on: noop,
        once: noop,
        pipe: noop,
        emit: noop,
        end: () => resolve(images)
      })
      .outputOptions([
        `-frames:v ${numFrames}`,
        '-vcodec png',
        `-vf scale=${width}:${width}/dar,fps=${fps}`,
        '-f image2pipe'
      ])
      .on('error', (e) => {
        reject(e);
      })
      .run();
  });
};

module.exports = getFrames;
