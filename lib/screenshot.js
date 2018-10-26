const fs = require('fs');
const _ = require('lodash');
const shell = require('shelljs');
const path = require('path');
const glob = require('glob');

const getRandom = (min, max) => {
  return Math.random() * (max - min) + min;
};

const getRandomTimestamps = (count, min, max) => {
  const timestamps = [];
  for (i = 0; i < count; i++) {
    timestamps.push(getRandom(min, max));
  }
  return timestamps;
};

const getLength = file => {
  const cmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${file}"`;
  return shell
    .exec(cmd, {
      silent: true
    })
    .stdout.trim();
};

const processFile = (
  positions,
  file,
  folder,
  timeParam,
  ffmpegCommand,
  fileExtension,
  isAsync = false
) => {
  const length = Math.floor(getLength(file) - 1);
  const baseName = path.parse(file).name;

  const promises = positions.map(position => {
    const sec = position * length;
    const outputFile = `${baseName} @ ${sec.toFixed(0)}s.${fileExtension}`;
    const outputPath = `${folder}/${outputFile}`;

    return new Promise((resolve, reject) => {
      const cmd = `ffmpeg -ss ${sec} ${timeParam} -i "${file}" ${ffmpegCommand} -y "${outputPath}"`;
      if (isAsync) {
        shell.exec(cmd, { silent: true }, (code, stdout, stderr) => {
          if (code === 0) {
            resolve(outputFile);
          } else {
            reject(stderr);
          }
        });
      } else {
        const result = shell.exec(cmd, { silent: true });
        if (result.code === 0) {
          resolve(outputFile);
        } else {
          reject(result.stderr);
        }
      }
    });
  });

  return Promise.all(promises);
};

const make = (
  globPattern,
  inputFolder,
  outputFolder,
  timeParam,
  ffmpegCommand,
  fileExtension,
  num,
  min,
  max,
  timestamps = null
) => {
  const files = glob.sync(globPattern, {
    cwd: inputFolder
  });
  const promises = files.map(file => {
    const fullPath = `${inputFolder}/${file}`;

    console.log(`Processing ${file}...`);

    if (_.isEmpty(timestamps)) {
      timestamps = getRandomTimestamps(num, min, max);
    }

    return processFile(
      timestamps,
      fullPath,
      outputFolder,
      timeParam,
      ffmpegCommand,
      fileExtension
    ).then(files => {
      files.forEach(file => {
        console.log(` * ${file}`);
      });
      return files;
    });
  });

  return Promise.all(promises).then(result => _.flatten(result));
};

const makeStills = (
  globPattern,
  inputFolder,
  outputFolder,
  num = 5,
  min = 0,
  max = 1,
  timestamps = null
) => {
  return make(
    globPattern,
    inputFolder,
    outputFolder,
    '',
    '-vframes 1 -vf lutyuv=y=val*1.1',
    'png',
    num,
    min,
    max,
    timestamps
  );
};

const makeGifs = (
  globPattern,
  inputFolder,
  outputFolder,
  num = 5,
  min = 0,
  max = 1
) => {
  return make(
    globPattern,
    inputFolder,
    outputFolder,
    '-t 2',
    '-v warning -filter_complex "[0:v] fps=12,scale=w=560:h=-1,split [a][b];[a] palettegen=stats_mode=single [p];[b][p] paletteuse=new=1"',
    // '-v warning -filter_complex "[0:v] fps=12,scale=960:-1,split [a][b];[a] palettegen [p];[b][p] paletteuse"',
    'gif',
    num,
    min,
    max
  );
};

module.exports = { makeStills, makeGifs };
