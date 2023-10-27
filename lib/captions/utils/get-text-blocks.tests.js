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
      getTextBlocks(
        `1 line
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
`,
        2,
        2,
        10,
        null
      )
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

  it('breaks large blocks into smaller blocks', () => {
    expect(
      getTextBlocks(`A field of wires
We'll see what it's worth to walk
To break the lines
Of alternate street
If I turn around what matters the most in time
We're going nowhere
Don't tell me now
The days I've had
To fill it up but spill instead
Talk to remind
Days weeks and hours
Days weeks and hours
Lone line`)
    ).toEqual([
      [
        'A field of wires',
        "We'll see what it's worth to walk",
        'To break the lines'
      ],
      [
        'Of alternate street',
        'If I turn around what matters the most in time',
        "We're going nowhere"
      ],
      [
        "Don't tell me now",
        "The days I've had",
        'To fill it up but spill instead'
      ],
      ['Talk to remind', 'Days weeks and hours', 'Days weeks and hours']
    ]);
  });
});
