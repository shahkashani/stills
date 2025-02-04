const ffmpeg = require('fluent-ffmpeg');

const noop = () => {};

const getFrame = async (url, seconds) => {
  const buffers = [];
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(url)
      .inputOptions(['-ss', seconds])
      .output({
        writable: true,
        write: (data) => buffers.push(data),
        on: noop,
        once: noop,
        pipe: noop,
        emit: noop,
        end: () => resolve(Buffer.concat(buffers))
      })
      .outputOptions([
        `-frames:v 1`,
        '-vcodec png',
        `-vf scale=iw*sar:ih`,
        '-f image2pipe'
      ])
      .on('error', (e) => {
        reject(e);
      })
      .run();
  });
};

module.exports = getFrame;
