const ffmpeg = require('fluent-ffmpeg');
const { writeFileSync, unlinkSync, statSync, copyFileSync } = require('fs');
const { round } = require('lodash');
const execCmd = require('../../utils/exec-cmd');

const GIF_SIZE_LIMIT_MB = 10;

const makeGif = async (
  file,
  images,
  fps = 12,
  fastEncode = false,
  isCompress = false
) => {
  return new Promise((resolve, reject) => {
    const prefix = `gif-${Math.random()}`;
    images.forEach((image, index) =>
      writeFileSync(`${prefix}-${index}.png`, image)
    );
    ffmpeg()
      .input(`${prefix}-%d.png`)
      .inputOptions(['-framerate', fps])
      .outputOptions(['-gifflags transdiff'])
      .inputOptions(
        fastEncode
          ? []
          : [
              '-filter_complex',
              'split [a][b];[a] palettegen=reserve_transparent=off:stats_mode=single [p];[b][p] paletteuse=new=1:dither=bayer:bayer_scale=3'
            ]
      )
      .output(file)
      .on('end', () => {
        images.forEach((_image, index) => unlinkSync(`${prefix}-${index}.png`));
        if (isCompress) {
          const sizeMb = statSync(file).size / (1024 * 1024);
          if (sizeMb > GIF_SIZE_LIMIT_MB) {
            copyFileSync(file, `${file} (uncompressed).gif`);
            console.log(`GIF size exceed ${GIF_SIZE_LIMIT_MB}MB, compressing.`);
            execCmd(`gifsicle --lossy=20 -O3 "${file}" -o "${file}"`);
            const newSizeMb = statSync(file).size / (1024 * 1024);
            console.log(`New file size: ${round(newSizeMb, 2)}MB`);
          }
        }
        resolve(file);
      })
      .on('error', (error) => {
        reject(error);
      })
      .run();
  });
};

module.exports = makeGif;
