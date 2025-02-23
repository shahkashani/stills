const formatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  year: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  hourCycle: 'h23',
  timeZone: 'America/New_York'
});

module.exports = (events = {}, now = Date.now(), isVerbose = false) => {
  const currentYear = now.getFullYear();

  if (isVerbose) {
    console.log(`📅 Now: ${formatter.format(now)}`);
  }

  for (const [key, event] of Object.entries(events)) {
    const eventDate =
      key.indexOf(':') !== -1
        ? `${key} ${currentYear}`
        : `${key} 00:00 EST ${currentYear}`;
    const eventStart = new Date(eventDate);
    const eventEnd = new Date(eventStart.getTime() + 60 * 60 * 24 * 1000);
    const progress =
      (now.getTime() - eventStart.getTime()) /
      (eventEnd.getTime() - eventStart.getTime());
    if (!Number.isFinite(eventStart.getTime())) {
      console.warn(`📅 Could not parse ${event} time into date: ${eventDate}`);
      continue;
    }
    if (isVerbose) {
      console.log(
        `📅 ${event}: ${formatter.format(eventStart)} - ${formatter.format(
          eventEnd
        )}`
      );
    }
    if (now >= eventStart && now <= eventEnd) {
      return {
        event,
        progress
      };
    }
  }

  return null;
};
