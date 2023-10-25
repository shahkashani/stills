const CaptionsDropin = require('./base/dropin');

class CaptionsStaticMatch extends CaptionsDropin {
  constructor(options) {
    super(options);
    this.matchText = options.matchText;
    this.captions = options.captions;
  }

  get name() {
    return 'static-match';
  }

  async getText() {
    return this.captions;
  }

  async getMatch() {
    return this.matchText;
  }
}

module.exports = CaptionsStaticMatch;
