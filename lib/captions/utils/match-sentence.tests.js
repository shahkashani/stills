const match = require('./match-sentence');

describe('match-sentence', () => {
  describe('case correction', () => {
    it('converts to uppercase', () => {
      expect(match('Hello', 'WELCOME TO FLAVORTOWN')).toEqual('HELLO');
    });
    it('converts to uppercase and adds quote', () => {
      expect(match('Hi', '(Guy) WELCOME TO FLAVORTOWN')).toEqual('(Guy) HI');
    });
    it('makes the first letter lowercase', () => {
      expect(match('And hello', 'welcome to flavortown')).toEqual('and hello');
    });
    it('fixes lowercase i', () => {
      expect(match("Hello i'm Guy", 'Welcome')).toEqual("Hello I'm Guy");
    });
    xit('makes the first letter lowercase despite quote', () => {
      expect(match('Hello', '(Guy) welcome to flavortown')).toEqual('hello');
    });
  });

  describe('prefixing', () => {
    it('adds dashes', () => {
      expect(match('Hello', '-Flavortown')).toEqual('-Hello');
      expect(match('Hello', '- Flavortown')).toEqual('- Hello');
      expect(match('-Hello', '- Flavortown')).toEqual('- Hello');
    });
    it('adds ellipsis', () => {
      expect(match('Hello', '...Flavortown')).toEqual('...Hello');
      expect(match('Hello', '...flavortown')).toEqual('...hello');
      expect(match('Hello', '. . .Flavortown')).toEqual('. . .Hello');
    });
    it('adds quotes and brackets', () => {
      expect(match('Hello', '(Guy) Flavortown')).toEqual('(Guy) Hello');
      expect(match('Hello', '[Whoosh] Flavortown')).toEqual('[Whoosh] Hello');
      expect(match('Hello', '-(Guy) Flavortown')).toEqual('-(Guy) Hello');
      expect(match('Hello', '-[Crash] Flavortown')).toEqual('-[Crash] Hello');
      expect(match('-(No) Hello', '-(Guy) Flavortown')).toEqual('-(Guy) Hello');
    });
    it('adds connector on lowercases without conjunctions', () => {
      expect(match('Hello', 'flavortown')).toEqual('and hello');
      expect(match('Hello', 'and flavortown')).toEqual('and hello');
    });
    xit('replaces quotes', () => {
      expect(match('[♪♪] Hello', '[♫] Flavortown')).toEqual('[♫] Hello');
      expect(match('(Guy) Hello', '(Egg) Flavortown')).toEqual('(Egg) Hello');
    });
    xit('leaves things alone', () => {
      expect(match('[♪♪] Hello', 'Flavortown')).toEqual('[♪♪] Hello');
      expect(match('(Guy) Hello', 'Flavortown')).toEqual('(Guy) Hello');
    });
  });

  describe('postfixing', () => {
    it('adds dashes', () => {
      expect(match('Hello', 'Flavortown --')).toEqual('Hello --');
    });
    it('adds ellipsis', () => {
      expect(match('Hello', 'Flavortown...')).toEqual('Hello...');
      expect(match('Hello', 'Flavortown. . .')).toEqual('Hello. . .');
      expect(match('Hello.', 'Flavortown. . .')).toEqual('Hello. . .');
    });
    it('adds quotes and brackets', () => {
      expect(match('Hello', 'Flavortown [Woosh]')).toEqual('Hello [Woosh]');
    });
    it('changes punctuation', () => {
      expect(match('Hello', 'Flavortown.')).toEqual('Hello.');
      expect(match('Hello.', 'Flavortown.')).toEqual('Hello.');
      expect(match('Hello.', 'Flavortown?')).toEqual('Hello?');
      expect(match('Hello!', 'Flavortown?')).toEqual('Hello?');
      expect(match('Hello!!', 'Flavortown?')).toEqual('Hello?');
      expect(match('Hello!!', 'Flavortown??')).toEqual('Hello??');
      expect(match('Hello!', 'Flavortown!!')).toEqual('Hello!!');
      expect(match('Hello!', 'Flavortown,')).toEqual('Hello,');
    });
    xit('leaves things alone', () => {
      expect(match('Hello [♪♪]', 'Flavortown')).toEqual('Hello [♪♪]');
      expect(match('Hello (Guy)', 'Flavortown')).toEqual('Hello (Guy)');
    });
    xit('adds multiple', () => {
      expect(match('Hello?', 'Flavortown? [Woosh]')).toEqual('Hello? [Woosh]');
    });
  });

  describe('conjuctions', () => {
    it('prefixes sentences', () => {
      expect(match('Hello!', 'and flavortown')).toEqual('and hello');
      expect(match('Hello!', 'and Flavortown')).toEqual('and hello');
      expect(match('And hello', 'and flavortown')).toEqual('and hello');
      expect(match('and hello', 'but flavortown')).toEqual('but hello');
      expect(match('and hello', 'BUT FLAVORTOWN')).toEqual('BUT HELLO');
    });
    it('postfixes sentences', () => {
      expect(match('Hello!', 'Flavortown and')).toEqual('Hello and');
    });
    xit('prefixes with other symbols nearby', () => {
      expect(match('...And hello', 'and flavortown')).toEqual('...and hello');
    });
    xit('postfixes with other symbols nearby', () => {
      expect(match('Hello!', 'flavortown but...')).toEqual('hello but...');
    });
    xit('corrects casing', () => {
      expect(match('Hello!', 'And Flavortown')).toEqual('And hello');
    });
  });

  describe('multiple transformations', () => {
    it('work in tandem', () => {
      expect(match('Hello, this is great!', 'and Flavortown is,')).toEqual(
        'and hello, this is great,'
      );
      expect(match('Hello, this is great!', '...and Flavortown is --')).toEqual(
        '...hello, this is great --'
      );
      expect(
        match("I'm Guy Fieri are we're rolling out! [♪♪]", 'Cool!')
      ).toEqual("I'm Guy Fieri are we're rolling out! [♪♪]");
      expect(
        match("I'm Guy Fieri are we're rolling out [♪♪]", 'Cool!')
      ).toEqual("I'm Guy Fieri are we're rolling out [♪♪]");
      expect(
        match("I'm Guy Fieri are we're rolling out [Wooshing]", 'Cool!')
      ).toEqual("I'm Guy Fieri are we're rolling out [Wooshing]");
    });
    xit('work in tandem', () => {
      expect(match('Hello, this is great!', '...and Flavortown is --')).toEqual(
        '...and hello, this is great --'
      );
    });
  });
});
