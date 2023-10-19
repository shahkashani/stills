const getTextBlocks = require('./get-text-blocks');

describe('getTextBlocks', () => {
  it('uses newline to define blocks', () => {
    expect(
      getTextBlocks(`In due time we will see the far butte lit by a flare.
I've seen your bravery, and I will follow you there

And row through the nighttime,
Gone healthy,
Gone healthy all of a sudden,
In search of the midwife

Who could help me
Who could help me`)
    ).toEqual([
      [
        'In due time we will see the far butte lit by a flare.',
        "I've seen your bravery, and I will follow you there"
      ],
      [
        'And row through the nighttime,',
        'Gone healthy,',
        'Gone healthy all of a sudden,',
        'In search of the midwife'
      ],
      ['Who could help me', 'Who could help me']
    ]);
  });

  it('short lines are ignored', () => {
    expect(
      getTextBlocks(`Wend, endlessly
towards seashores unmapped.

*

Last week,
our picture window`)
    ).toEqual([
      ['Wend, endlessly', 'towards seashores unmapped.'],
      ['Last week,', 'our picture window']
    ]);
  });

  it('short blocks are ignored', () => {
    expect(
      getTextBlocks(`Wend, endlessly
towards seashores unmapped.
*
Last week, our picture window`)
    ).toEqual([['Wend, endlessly', 'towards seashores unmapped.']]);
  });

  it('long blocks are ignored', () => {
    expect(
      getTextBlocks(`1 line
2 lines
3 lines
4 lines
5 lines
6 lines
7 lines
8 lines
9 lines
10 lines
*
1 line
2 lines
3 lines
4 lines
5 lines
6 lines
7 lines
8 lines
9 lines
10 lines
11 lines
`)
    ).toEqual([
      [
        '1 line',
        '2 lines',
        '3 lines',
        '4 lines',
        '5 lines',
        '6 lines',
        '7 lines',
        '8 lines',
        '9 lines',
        '10 lines'
      ]
    ]);
  });
});
