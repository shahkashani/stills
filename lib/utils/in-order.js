module.exports = inOrder = (array, isDebug = false) => {
  const hours = parseInt(
    new Date().toLocaleString('en-US', {
      hour: 'numeric',
      hourCycle: 'h24',
      timeZone: 'Europe/Paris'
    }),
    10
  );
  const index = hours % array.length;
  if (isDebug) {
    console.log(`⏰ It's ${hours}, picking index ${index}`);
  }
  return array[index];
};
