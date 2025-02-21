const getActiveEvent = require('./get-active-event');

describe('getActiveEvent', () => {
  it('accepts midnight events', () => {
    const events = {
      'February 23': 'before',
      'February 24': 'tp'
    };
    expect(
      getActiveEvent(events, new Date('Feb 24 2024 00:00:00 EST'))
    ).toEqual('tp');
    expect(
      getActiveEvent(events, new Date('Feb 24 2024 23:59:00 EST'))
    ).toEqual('tp');
    expect(
      getActiveEvent(events, new Date('Feb 25 2024 00:00:00 EST'))
    ).toEqual(null);
    expect(
      getActiveEvent(events, new Date('Feb 23 2024 23:59:00 EST'))
    ).toEqual('before');
    expect(
      getActiveEvent(events, new Date('Feb 22 2024 23:59:00 EST'))
    ).toEqual(null);
  });

  it('accepts timestamped events', () => {
    const events = {
      'February 24 10:00': 'tp'
    };
    expect(
      getActiveEvent(events, new Date('Feb 24 2024 09:59:00 EST'))
    ).toEqual(null);
    expect(
      getActiveEvent(events, new Date('Feb 24 2024 10:00:00 EST'))
    ).toEqual('tp');
    expect(
      getActiveEvent(events, new Date('Feb 25 2024 09:00:00 EST'))
    ).toEqual('tp');
    expect(
      getActiveEvent(events, new Date('Feb 25 2024 10:01:00 EST'))
    ).toEqual(null);
  });

  it('works with current date', () => {
    const date = new Date().toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      timeZone: 'America/New_York'
    });
    const events = {
      [date]: 'tp'
    };
    expect(getActiveEvent(events)).toEqual('tp');
  });
});
