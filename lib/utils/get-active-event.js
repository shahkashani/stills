module.exports = (
  events = {},
  now = Date.now(),
  timeZone = 'America/New_York'
) => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
    timeZone
  });

  const currentDateStr = formatter.format(now);
  const [currentMonthDay, currentHourMinute] = currentDateStr.split(' at ');

  const [currentHour, currentMinute] = currentHourMinute.split(':').map(Number);
  const currentTimeInMinutes = currentHour * 60 + currentMinute;

  for (const [key, value] of Object.entries(events)) {
    const match = key.match(/^(.*?)(?: (\d{1,2}):(\d{2}))?$/);
    if (!match) continue;

    const datePart = match[1];
    const startHour = match[2] ? parseInt(match[2], 10) : 0;
    const startMinute = match[3] ? parseInt(match[3], 10) : 0;
    const eventStartInMinutes = startHour * 60 + startMinute;
    const eventEndInMinutes = (eventStartInMinutes + 24 * 60) % (24 * 60); 

    if (
      currentMonthDay === datePart &&
      currentTimeInMinutes >= eventStartInMinutes
    ) {
      return value;
    }

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayDateStr = formatter.format(yesterday).split(' at ')[0];

    if (
      yesterdayDateStr === datePart &&
      currentTimeInMinutes < eventEndInMinutes
    ) {
      return value;
    }
  }
  return null;
};
