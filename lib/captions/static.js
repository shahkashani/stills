class CaptionsStatic {
  constructor({ captions = [] } = []) {
    this.captions = captions.map((c) => (Array.isArray(c) ? c : [c]));
  }

  async get() {
    return { captions: this.captions };
  }
}

module.exports = CaptionsStatic;
