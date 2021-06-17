class CaptionsStatic {
  constructor({ captions = [] } = []) {
    this.captions = captions.map((c) => (Array.isArray(c) ? c : [c]));
  }

  get name() {
    return 'static';
  }

  async get() {
    return { captions: this.captions };
  }
}

module.exports = CaptionsStatic;
