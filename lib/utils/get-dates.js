const getMonth = (timeZone = 'America/New_York', date = new Date()) => {
  const monthFormatter = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    timeZone
  });
  return monthFormatter.format(date);
};

const getDayOfMonth = (timeZone = 'America/New_York', date = new Date()) => {
  const dayFormatter = new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    timeZone
  });
  return parseInt(dayFormatter.format(date));
};

module.exports = {
  getDayOfMonth,
  getMonth
};
