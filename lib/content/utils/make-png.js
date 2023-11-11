const { writeFileSync } = require('fs');
const makePng = async (file, buffer) => writeFileSync(file, buffer);

module.exports = makePng;
