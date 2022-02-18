module.exports = () => {
  const string = new Date().toLocaleString('en-US', {
    hour: 'numeric',
    hourCycle: 'h23',
    timeZone: 'America/New_York'
  });
  return parseInt(string, 10);
};
