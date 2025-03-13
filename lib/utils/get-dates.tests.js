const { getMonth, getDayOfMonth } = require('./get-dates');

describe('getMonth', () => {
  it('returns month', () => {
    expect(
      getMonth('America/New_York', new Date('December 31 2024 23:59:59 EST'))
    ).toEqual('December');
    expect(
      getMonth('America/New_York', new Date('January 31 2024 00:00:00 EST'))
    ).toEqual('January');
  });

  it('returns day of month', () => {
    expect(
      getDayOfMonth(
        'America/New_York',
        new Date('December 31 2024 23:59:59 EST')
      )
    ).toEqual(31);
    expect(
      getDayOfMonth(
        'America/New_York',
        new Date('December 01 2024 23:59:59 EST')
      )
    ).toEqual(1);
  });
});
