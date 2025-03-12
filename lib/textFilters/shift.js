class TextFilterShift {
  constructor({ shift = 1 } = {}) {
    this.shift = shift;
  }

  get name() {
    return 'shift';
  }

  performShift(string, k) {
    var n = 26;
    if (k < 0) {
      return this.performShift(string, k + n);
    }
    return string
      .split('')
      .map((c) => {
        if (c.match(/[a-z]/i)) {
          var code = c.charCodeAt();
          var shift =
            code >= 65 && code <= 90 ? 65 : code >= 97 && code <= 122 ? 97 : 0;
          return String.fromCharCode(((code - shift + k) % n) + shift);
        }
        return c;
      })
      .join('');
  }

  getShift(string) {
    return string.toLowerCase().charCodeAt() - 'a'.charCodeAt() + 1;
  }

  apply(text) {
    const numShift =
      typeof this.shift === 'string' ? this.getShift(this.shift) : this.shift;
    return this.performShift(text, numShift);
  }
}

module.exports = TextFilterShift;
