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

const getTimestamp = (filename, seconds) => {
  if (Number.isFinite(seconds)) {
    return seconds;
  }
  return getRandomTimestamp(getVideoLength(filename));
};

const getTimestamps = (filename, num, seconds, apart, duration = 0) => {
  const results = [];
  const start = getTimestamp(filename, seconds);
  for (let i = 0; i < num; i += 1) {
    results.push(start + i * (apart + duration));
  }
  return results;
};

const fillTimestamps = (timestamps, apart) => {
  if (!Array.isArray(timestamps) || timestamps[0] === 0) {
    return timestamps;
  }
  const result = [...timestamps];
  const start = result[0];
  for (let i = 0; i < timestamps.length; i += 1) {
    if (result[i] === 0) {
      result[i] = start + i * apart;
    }
  }
  return result;
};

const getSourceSeconds = (string) => {
  if (!string || Number.isFinite(string)) {
    return string;
  }
  if (string.toString().indexOf(':') !== -1) {
    if (string.match(/:/g).length < 2) {
      string = `00:${string}`;
    }
    const [h, m, s] = string.split(':');
    return parseFloat(h) * 3600 + parseFloat(m) * 60 + parseFloat(s);
  }
  return parseFloat(string);
};

module.exports = {
  shell,
  getVideoLength,
  getRandomTimestamp,
  getTimestamp,
  getTimestamps,
  fillTimestamps,
  getSourceSeconds
};
