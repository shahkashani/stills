const execCmd = require('./exec-cmd');

const SEPARATOR = '|';

module.exports = (file, coordinates = []) => {
  const format = coordinates.map(
    (coordinate) => `%[pixel:p{${coordinate[0]},${coordinate[1]}}]`
  );

  const output = execCmd(
    `convert "${file}" -format "${format.join(SEPARATOR)}" info:`
  );

  return output.split(SEPARATOR);
};
