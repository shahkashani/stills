const { exec } = require('shelljs');
const { execFileSync } = require('child_process');
const { random } = require('lodash');

const shell = (cmd) => {
  const result = exec(cmd, { silent: true });
  if (result.code !== 0) {
    throw new Error(`Shell command error: ${result.stderr.trim()}\n> ${cmd}`);
  }
  return result.stdout;
};

// No shell: each argument is passed to the process literally, so a filename
// cannot be interpreted as syntax.
const shellArgs = (bin, args) => {
  try {
    return execFileSync(bin, args, { encoding: 'utf8' });
  } catch (err) {
    const stderr = err.stderr ? err.stderr.toString().trim() : err.message;
    throw new Error(`Shell command error: ${stderr}\n> ${bin} ${args.join(' ')}`);
  }
};

const getVideoLength = (file) => {
  const output = shellArgs('ffprobe', [
    '-v',
    'error',
    '-show_entries',
    'format=duration',
    '-of',
    'default=noprint_wrappers=1:nokey=1',
    file,
  ]);
  return output.trim();
};

const getRandomTimestamp = (upper, lower = 0) =>
  random(Math.ceil(lower), Math.floor(upper));

const getTimestamp = (totalLength, seconds, isPreferBeginning = false) => {
  if (Number.isFinite(seconds)) {
    return seconds;
  }
  return getRandomTimestamp(
    isPreferBeginning ? totalLength * 0.5 : totalLength
  );
};

const getTimestamps = (
  totalLength,
  num,
  seconds,
  apart,
  duration = 0,
  isPreferBeginning = false
) => {
  const results = [];
  const start = getTimestamp(totalLength, seconds, isPreferBeginning);
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
