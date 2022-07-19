const execCmd = require('../utils/exec-cmd');
const getHex = require('../utils/get-hex');
const getImperfectCircle = require('../utils/get-imperfect-circle');
const { range, random } = require('lodash');

module.exports = async (frame, image) => {
  const { width, height } = frame.getInfo();
  const mask = await frame.getMask(0.01);

  console.log(mask);
  let coordinates = image.coordinates;

  if (!coordinates) {
    coordinates = range(0, 50).map((i) => [
      random(0, width, false),
      random(0, height, false)
    ]);
    image.coordinates = coordinates;
  }

  const hexes = getHex(frame.original, coordinates);
  const maskHexes = mask ? getHex(mask, coordinates) : null;

  const commands = coordinates.reduce((memo, coordinates, i) => {
    if (maskHexes) {
      if (maskHexes[i] === 'srgba(0,0,0,0)') {
        console.log(maskHexes[i]);
        return memo;
      }
    }
    const circle = getImperfectCircle(coordinates[0], coordinates[1], 1, 5);
    memo.push(`-fill "${hexes[i]}" -draw "${circle}"`);
    return memo;
  }, []);

  const commandString = commands.join(' ');
  const cmd = `convert "${frame.file}" \\( -size ${width}x${height} xc:transparent ${commandString} \\) -composite "${frame.file}"`;
  execCmd(cmd);
};
