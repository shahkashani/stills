const { exec } = require('shelljs');
const { random } = require('lodash');

const shell = (cmd) => {
  const result = exec(cmd, { silent: true });
  if (result.code !== 0) {
    throw new Error(`Shell command error: ${result.stderr.trim()}\n> ${cmd}`);
  }
  return result.stdout;
};

const getVideoLength = (file) => {
  const output = shell(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${file}"`
  );
  return output.trim();
};

const getRandomTimestamp = (upper, lower = 0) =>
  random(Math.ceil(lower), Math.floor(upper));

const getEpisodeName = (filename) => filename.replace(/\.*$/, '');

const getTimestamp = (filename, seconds) => {
  if (Number.isFinite(seconds)) {
    return seconds;
  }
  return getRandomTimestamp(getVideoLength(filename));
};

module.exports = {
  shell,
  getVideoLength,
  getRandomTimestamp,
  getEpisodeName,
  getTimestamp
};
