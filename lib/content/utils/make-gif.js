const ffmpeg = require('fluent-ffmpeg');
const { writeFileSync, unlinkSync } = require('fs');

const makeGif = async (file, images, fps = 12, fastEncode = false) => {
  return new Promise((resolve, reject) => {
    const prefix = `gif-${Math.random()}`;
    images.forEach((image, index) =>
      writeFileSync(`${prefix}-${index}.png`, image)
    );
    ffmpeg()
      .input(`${prefix}-%d.png`)
      .inputOptions(['-framerate', fps])
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
        resolve(file);
      })
      .on('error', () => {
        reject();
      })
      .run();
  });
};

module.exports = makeGif;
