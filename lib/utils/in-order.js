const getHour = require('./get-hour');

module.exports = inOrder = (array, isDebug = false) => {
  const hours = getHour();
  const index = hours % array.length;
  if (isDebug) {
    console.log(`⏰ It's ${hours}, picking index ${index}`);
  }
  return array[index];
};
