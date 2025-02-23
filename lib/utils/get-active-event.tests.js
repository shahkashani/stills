const getActiveEvent = require('./get-active-event');

describe('getActiveEvent', () => {
  it('accepts midnight events', () => {
    const events = {
      'February 23': 'before',
      'February 24': 'tp'
    };
    expect(
      getActiveEvent(events, new Date('Feb 24 2024 00:00:01 EST'))
    ).toMatchObject({ event: 'tp' });
    expect(
      getActiveEvent(events, new Date('Feb 24 2024 23:59:00 EST'))
    ).toMatchObject({ event: 'tp' });
    expect(
      getActiveEvent(events, new Date('Feb 25 2024 00:00:01 EST'))
    ).toEqual(null);
    expect(
      getActiveEvent(events, new Date('Feb 23 2024 23:59:00 EST'))
    ).toMatchObject({ event: 'before' });
    expect(
      getActiveEvent(events, new Date('Feb 22 2024 23:59:00 EST'))
    ).toEqual(null);
  });

  it('accepts timestamped events', () => {
    const events = {
      'February 24 10:00 EST': 'tp'
    };
    expect(
      getActiveEvent(events, new Date('Feb 24 2024 09:59:00 EST'))
    ).toEqual(null);
    expect(
      getActiveEvent(events, new Date('Feb 24 2024 10:00:00 EST'))
    ).toMatchObject({ event: 'tp' });
    expect(
      getActiveEvent(events, new Date('Feb 25 2024 09:00:00 EST'))
    ).toMatchObject({ event: 'tp' });
    expect(
      getActiveEvent(events, new Date('Feb 25 2024 10:01:00 EST'))
    ).toEqual(null);
  });

  it('accepts non-full-hour timestamped events', () => {
    const events = {
      'February 24 10:30 EST': 'tp'
    };
    expect(
      getActiveEvent(events, new Date('Feb 24 2024 10:29:00 EST'))
    ).toEqual(null);
    expect(
      getActiveEvent(events, new Date('Feb 24 2024 10:30:00 EST'))
    ).toMatchObject({ event: 'tp' });
    expect(
      getActiveEvent(events, new Date('Feb 25 2024 10:29:00 EST'))
    ).toMatchObject({ event: 'tp' });
    expect(
      getActiveEvent(events, new Date('Feb 25 2024 11:31:00 EST'))
    ).toEqual(null);
  });

  it('returns progress', () => {
    const events = {
      'February 24 10:30 EST': 'tp'
    };
    expect(
      getActiveEvent(events, new Date('Feb 24 2024 10:30:00 EST'))
    ).toEqual({ event: 'tp', progress: 0 });
    expect(
      getActiveEvent(events, new Date('Feb 25 2024 10:30:00 EST'))
    ).toEqual({ event: 'tp', progress: 1 });
    expect(
      getActiveEvent(events, new Date('Feb 24 2024 22:30:00 EST'))
    ).toEqual({ event: 'tp', progress: 0.5 });
  });
});
