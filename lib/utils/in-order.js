const getHour = require('./get-hour');

module.exports = inOrder = (array, isDebug = false, useHours = null) => {
  const hours = Number.isFinite(useHours) ? useHours : getHour();
  const index = hours % array.length;
  if (isDebug) {
    if (Number.isFinite(useHours)) {
      console.log(`⏰ Using provided ${useHours}, picking index ${index}`);
    } else {
      console.log(`⏰ It's ${hours}, picking index ${index}`);
    }
  }
  return array[index];
};
