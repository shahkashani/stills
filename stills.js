const ffmpeg = require('fluent-ffmpeg');
const noop = () => {};
const measure = require('./lib/utils/measure');
const iendSignature = [73, 69, 78, 68, 174, 66, 96, 130];
const { writeFileSync, unlinkSync } = require('fs');
const gif = require('./lib/content/gif');

const fps = 12;
const width = 720;
const filename = '../fieriframes/videos/S34E10 Savory with a Side of Sweet.mp4';

const computeLPSArray = (pattern) => {
  const lps = Array(pattern.length).fill(0);
  let len = 0;
  let i = 1;
  while (i < pattern.length) {
    if (pattern[i] === pattern[len]) {
      len++;
      lps[i] = len;
      i++;
    } else {
      if (len !== 0) {
        len = lps[len - 1];
      } else {
        lps[i] = 0;
        i++;
      }
    }
  }
  return lps;
};

const KMPSearch = (text, pattern) => {
  const lps = computeLPSArray(pattern);
  let i = 0;
  let j = 0;
  while (i < text.length) {
    if (pattern[j] === text[i]) {
      i++;
      j++;
    }
    if (j === pattern.length) {
      return i - j;
    } else if (i < text.length && pattern[j] !== text[i]) {
      if (j !== 0) {
        j = lps[j - 1];
      } else {
        i++;
      }
    }
  }
  return -1;
};

const download = async (seconds, length = 2) => {
  const buffers = [];
  const images = [];
  const numFrames = fps * length;
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(filename)
      .inputOptions(['-ss', seconds])
      .output({
        writable: true,
        write: (data) => {
          const result = KMPSearch(data, iendSignature);
          if (result !== -1) {
            const currentPart = data.slice(0, result + iendSignature.length);
            buffers.push(currentPart);
            images.push(Buffer.concat(buffers));
            buffers.length = 0;
            buffers.push(data.slice(result + iendSignature.length));
          } else {
            buffers.push(data);
          }
        },
        on: noop,
        once: noop,
        pipe: noop,
        emit: noop,
        end: () => {
          resolve(images);
        }
      })
      .outputOptions([
        `-frames:v ${numFrames}`,
        '-vcodec png',
        `-vf scale=${width}:${width}/dar,fps=${fps}`,
        '-f image2pipe'
      ])
      .on('error', () => {
        reject();
      })
      .run();
  });
};

const write = async (file, images, isFast = false) => {
  return new Promise((resolve, reject) => {
    images.forEach((image, index) => writeFileSync(`img-${index}.png`, image));
    ffmpeg()
      .input('img-%d.png')
      .inputOptions(['-framerate', fps])
      .inputOptions(
        isFast
          ? []
          : [
              '-filter_complex',
              'split [a][b];[a] palettegen=reserve_transparent=off:stats_mode=single [p];[b][p] paletteuse=new=1:dither=bayer:bayer_scale=3'
            ]
      )
      .output(file)
      .on('end', () => {
        images.forEach((_image, index) => unlinkSync(`img-${index}.png`));
        resolve(file);
      })
      .on('error', () => {
        reject();
      })
      .run();
  });
};

(async () => {
  const seconds = 100;
  const duration = 3;

  await measure('new', async () => {
    const images = await measure('still', () => download(seconds, duration));
    await measure('gif', () => write('test.gif', images, true));
  });
  await measure('legacy', async () => {
    const legacy = new gif({ width, duration });
    legacy.generate(filename, 'legacy.gif', 1, [seconds]);
  });
})();

// download stills as buffers and use those for encoding
// generate a fast gif just for previews
// on collapse, generate a non-fast / optimized gif