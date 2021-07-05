const match = require('./match-sentence');

describe('match-sentence', () => {
  describe('case correction', () => {
    it('converts to uppercase', () => {
      expect(match('Hello', 'WELCOME TO FLAVORTOWN')).toEqual('AND HELLO');
      expect(match('Hello.', 'DRAG McCONAUGHEY UP FROM AUSTIN.')).toEqual(
        'AND HELLO.'
      );
    });
    it('converts to uppercase with action', () => {
      expect(match('Hello', '[Guy] WELCOME TO FLAVORTOWN')).toEqual(
        '[Guy] AND HELLO'
      );
    });
    it('makes the first letter lowercase', () => {
      expect(match('And hello', 'welcome to flavortown')).toEqual('and hello');
    });
    it('fixes lowercase i', () => {
      expect(match("Hello i'm Guy", 'Welcome')).toEqual("Hello I'm Guy");
    });
    it('makes the first letter lowercase despite prefixes', () => {
      expect(match('Hello', '(Guy) ...welcome to flavortown')).toEqual(
        '(Guy) ...hello'
      );
      expect(match('Hello', '[Crash] ...welcome to flavortown')).toEqual(
        '[Crash] ...hello'
      );
    });
    it('leaves it alone if it needs to', () => {
      expect(match('Hello', 'Guy, welcome to flavortown')).toEqual('Hello');
    });
  });

  describe('prefixing', () => {
    it('adds dashes', () => {
      expect(match('Hello', '-Flavortown')).toEqual('-Hello');
      expect(match('Hello', '- Flavortown')).toEqual('- Hello');
      expect(match('Hello', '-- Flavortown')).toEqual('-- Hello');
      expect(match('-Hello', '- Flavortown')).toEqual('- Hello');
      expect(match('-Hello', '-- Flavortown')).toEqual('-- Hello');
    });
    it('adds ellipsis', () => {
      expect(match('Hello', '...Flavortown')).toEqual('...Hello');
      expect(match('Hello', '…Flavortown')).toEqual('…Hello');
    });
    it('adds quotes and brackets', () => {
      expect(match('Hello', '(Guy) Flavortown')).toEqual('(Guy) Hello');
      expect(match('Hello', 'FIERI: Flavortown')).toEqual('FIERI: Hello');
      expect(match('Hello', '[Whoosh] Flavortown')).toEqual('[Whoosh] Hello');
      expect(match('Hello', '-(Guy) Flavortown')).toEqual('-(Guy) Hello');
      expect(match('Hello', '-[Crash] Flavortown')).toEqual('-[Crash] Hello');
      expect(match('-(No) Hello', '-(Guy) Flavortown')).toEqual(
        '-(Guy) -(No) Hello'
      );
    });
    it('adds connector on lowercases without conjunctions', () => {
      expect(match('but hello hi', 'flavortown')).toEqual('but hello hi');
      expect(match('Hello hi.', 'Flavortown.')).toEqual('Hello hi.');
      expect(match('hello hi', 'flavortown')).toEqual('and hello hi');
      expect(match('I am here', 'This is it')).toEqual('I am here');
      expect(match('I am here', 'THIS IS IT')).toEqual('I AM HERE');
      expect(match('well, I am here', 'THIS IS IT')).toEqual(
        'AND WELL, I AM HERE'
      );
    });
    it('leaves things alone', () => {
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
      expect(match('Hello', 'Flavortown…')).toEqual('Hello…');
    });
    it('changes punctuation', () => {
      expect(match('Hello', 'Flavortown.')).toEqual('Hello.');
      expect(match('Hello', 'I want to see magic')).toEqual('Hello');
      expect(match('Hello hi.', 'Well you want to see magic,')).toEqual(
        'Hello hi,'
      );
      expect(match('Hello.', 'Flavortown?')).toEqual('Hello?');
      expect(match('Hello!', 'Flavortown?')).toEqual('Hello?');
      expect(match('Hello!!', 'Flavortown?')).toEqual('Hello?');
      expect(match('Hello!!', 'Flavortown??')).toEqual('Hello??');
      expect(match('Hello!', 'Flavortown!!')).toEqual('Hello!!');
      expect(match('Hello!', 'Flavortown,')).toEqual('Hello,');
      expect(match('Hello', 'Flavortown)')).toEqual('Hello');
    });
    it('strips punctuation', () => {
      expect(match('Hello.', 'Flavortown')).toEqual('Hello');
    });
    it('leaves things alone', () => {
      expect(match('Hello [♪♪]', 'Flavortown')).toEqual('Hello [♪♪]');
      expect(match('Hello (Guy)', 'Flavortown')).toEqual('Hello (Guy)');
    });
    it('adds multiple', () => {
      expect(match('Hello', '[Woosh] Flavortown?')).toEqual('[Woosh] Hello?');
    });
  });

  describe('conjuctions', () => {
    it('prefixes sentences', () => {
      expect(match('Hello', 'and flavortown')).toEqual('and hello');
      expect(match('Hello!', 'and Flavortown!')).toEqual('and hello!');
      expect(match('And hello', 'and flavortown')).toEqual('and hello');
      expect(match('and hello', 'but flavortown')).toEqual('and hello');
      expect(match('and hello', 'BUT FLAVORTOWN')).toEqual('AND HELLO');
    });
    it('postfixes sentences', () => {
      expect(match('Hello!', 'Flavortown and')).toEqual('Hello and');
    });
    it('works with other symbols prefixed', () => {
      expect(match('...And hello', 'and flavortown')).toEqual('...and hello');
    });
    it('works with other symbols postfixed', () => {
      expect(match('Hello!', 'flavortown but...')).toEqual('and hello but...');
    });
    it('corrects casing', () => {
      expect(match('Hello!', 'and Flavortown!')).toEqual('and hello!');
    });
  });

  describe('multiple transformations', () => {
    it('work in tandem', () => {
      expect(
        match("I'm Guy Fieri are we're rolling out [♪♪]", 'Cool!')
      ).toEqual("I'm Guy Fieri are we're rolling out! [♪♪]");
      expect(match('Hello, this is great!', 'and Flavortown is,')).toEqual(
        'and hello, this is great,'
      );
      expect(match('Hello, this is great!', '...and Flavortown is --')).toEqual(
        '...and hello, this is great --'
      );
      expect(
        match("I'm Guy Fieri are we're rolling out [♪♪]", 'Cool!')
      ).toEqual("I'm Guy Fieri are we're rolling out! [♪♪]");
      expect(
        match("I'm Guy Fieri are we're rolling out [Wooshing]", 'Cool!')
      ).toEqual("I'm Guy Fieri are we're rolling out! [Wooshing]");
    });
  });
});