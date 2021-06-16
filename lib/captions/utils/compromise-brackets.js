const REASON = 'stills';

module.exports = (Doc, world) => {
  world.postProcess((doc) => {
    doc.termList().forEach((term) => {
      const { pre, post } = term;
      const isBracket = pre.match(/\[/) && post.match(/\]/);
      const isParentheses = pre.match(/\(/) && post.match(/\)/);
      const isQuote = post.match(/:/); // might wanna consider adding additionals checks here
      if (isBracket || isParentheses || isQuote) {
        term.tag('Bracket', REASON, world);
      }
      if (isBracket) {
        term.tag('SquareBracket', REASON, world);
      }
      if (isParentheses) {
        term.tag('Parentheses', REASON, world);
      }
    });
  });
};
