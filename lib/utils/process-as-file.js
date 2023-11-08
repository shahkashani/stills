const { readFileSync, writeFileSync, unlinkSync } = require('fs');

const processAsFile = async (frame, callback) => {
  const currentFile = `${Math.random()}${frame.index}-current.png`;
  const originalFile = `${Math.random()}${frame.index}-original.png`;

  writeFileSync(currentFile, frame.buffer);
  writeFileSync(originalFile, frame.originalBuffer);

  await callback(currentFile, originalFile);
  frame.buffer = readFileSync(currentFile);
  unlinkSync(currentFile);
  unlinkSync(originalFile);
};

module.exports = processAsFile;
