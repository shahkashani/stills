const { resolve } = require('path');
const CaptionFinder = require('./caption-finder');

const folder = resolve(__dirname, '../../../data/srts');
const episodes = [
  'S01E01 Classics',
  'S27E05 Mex to the Max',
  'S39E07 New Faces and Old Places'
];

const cm = new CaptionFinder({
  folder,
  episodes,
  matchParams: { connector: 'and' }
});

describe('CaptionFinder', () => {
  it('finds single caption', () => {
    const search = ['What is it?', 'My mouth is metering'];
    const result = cm.find(search);
    const {
      timestamps,
      captions,
      name,
      match: { text, start, end }
    } = result;
    expect(name).toEqual('S27E05 Mex to the Max');
    expect(captions).toEqual(captions);
    expect(text).toEqual('My mouth is watering.');
    expect(start).toEqual(1088.588);
    expect(end).toEqual(1089.787);
    expect(timestamps[1]).toEqual(start + (end - start) / 2);
    expect(timestamps[0]).toBeLessThan(timestamps[1]);
  });

  it('extends a single string search', () => {
    const { captions } = cm.find("and don't come here all the time", 3);
    expect(captions).toEqual([
      'WELL, I FEEL SORRY FOR THE PEOPLE',
      "AND DON'T COME HERE ALL THE TIME.",
      'I GET TO, YOU KNOW, EXPERIENCE ALL THE DIFFERENT THINGS.'
    ]);
  });

  it('extends a single string search from a caption further into the search', () => {
    const { captions } = cm.find(
      ['one', 'two', 'three', 'four', "don't come here all the time"],
      10
    );

    expect(captions).toEqual([
      'REALLY KNEW HOW GREAT THAT WAS,',
      'AND ONE.',
      'TWO.',
      'THREE.',
      'FOUR',
      "AND DON'T COME HERE ALL THE TIME.",
      'I GET TO, YOU KNOW, EXPERIENCE ALL THE DIFFERENT THINGS.',
      "IF YOU'RE JUST COMING THROUGH TO VEGAS ONCE IN A WHILE,",
      "YOU KNOW, YOU'RE GONNA GET SOMETHING GREAT,",
      "BUT YOU'RE NOT GONNA GET ALL THE GREAT STUFF THEY HAVE."
    ]);
  });

  it('matches an optional different string', () => {
    const { captions } = cm.find(
      'well, looky here',
      3,
      "and don't come here all the time"
    );
    expect(captions).toEqual([
      'WELL, I FEEL SORRY FOR THE PEOPLE',
      'AND WELL, LOOKY HERE.',
      'I GET TO, YOU KNOW, EXPERIENCE ALL THE DIFFERENT THINGS.'
    ]);
  });

  it('extends a single string padded search at the beginning of an episode', () => {
    const { captions } = cm.find(
      "HI, EVERYBODY, I'M GIRL FIERI, AND WE'RE ROLLIN' OUT",
      3
    );
    expect(captions).toEqual([
      "AND HI, EVERYBODY, I'M GIRL FIERI, AND WE'RE ROLLIN' OUT,",
      "HEADED FOR SOME OF AMERICA'S GREATEST"
    ]);
  });

  it('extends a single string padded search at the end of an episode', () => {
    const { captions } = cm.find('OPEN UP.', 5);
    expect(captions).toEqual([
      'BUT WE GOT PLENTY MORE JOINTS WE GOTTA HIT.',
      `WE'LL SEE YA NEXT TIME ON "DINERS, DRIVE-INS, AND DIVES."`,
      'AND OPEN UP.'
    ]);
  });

  it('extends a multi-string search', () => {
    const { captions } = cm.find(
      ["and don't come here all the time", 'homeschooled'],
      5
    );
    expect(captions).toEqual([
      "THE SHAWARMA IS ONLY ONE REASON THE CROWDS KEEP JAMMIN' IN.",
      'WELL, I FEEL SORRY FOR THE PEOPLE',
      "AND DON'T COME HERE ALL THE TIME.",
      'HOMESCHOOLED.',
      "IF YOU'RE JUST COMING THROUGH TO VEGAS ONCE IN A WHILE,",
      "YOU KNOW, YOU'RE GONNA GET SOMETHING GREAT,",
      "BUT YOU'RE NOT GONNA GET ALL THE GREAT STUFF THEY HAVE."
    ]);
  });

  it('handles complex cases', () => {
    const captions = [
      'I slept all day.',
      'Go ahead and start pouring the oil. Slow.',
      'I woke with distaste.',
      'And I raved.',
      'That the difference between.',
      'The sprout and the bean.',
      'It is a golden ring.',
      'It is a twisted string.'
    ];
    const result = cm.find(captions, 10);
    expect(result.captions).toEqual([
      '-For 24 hours. -Next up?',
      "We're gonna do the salsa verde right here.",
      'We have the boiled jalapeños,',
      'garlic, the onions, the salt,',
      'I slept all day.',
      'Go ahead and start pouring the oil. Slow.',
      'I woke with distaste?',
      'And I raved.',
      'That the difference between.',
      'The sprout and the bean,',
      'and it is a golden ring.'
    ]);
  });
});
