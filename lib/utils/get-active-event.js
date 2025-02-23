const formatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  year: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  hourCycle: 'h23',
  timeZone: 'America/New_York'
});

const addTime = (string, now) => {
  const currentYear = now.getFullYear();
  return string.indexOf(':') !== -1
    ? `${string} ${currentYear}`
    : `${string} 00:00 EST ${currentYear}`;
};

module.exports = (events = {}, now = new Date(), isVerbose = false) => {
  const currentYear = now.getFullYear();

  if (isVerbose) {
    console.log(`📅 Now: ${formatter.format(now)}`);
  }

  for (const [key, event] of Object.entries(events)) {
    const [start, end] = key.split(/\s->\s/);

    const eventStart = new Date(addTime(start, now));
    const eventEnd = end
      ? new Date(addTime(end, now))
      : new Date(eventStart.getTime() + 60 * 60 * 24 * 1000);

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
