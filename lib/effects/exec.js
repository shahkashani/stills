const { execSync, execFileSync } = require('child_process');

// Single-quote a value for /bin/sh. Everything between single quotes is
// literal, and an embedded quote is written as '\''. Double quotes are not
// enough: the shell still expands $(...) and backticks inside them, so a
// filename containing one is executed rather than opened.
const quote = (value) => `'${String(value).replace(/'/g, `'\\''`)}'`;

// Two calling conventions, same idea as utils/exec-cmd:
//
//   exec(image, '-flip -rotate 90')         cmd is a shell fragment
//   exec(image, ['-flip', '-rotate', '90']) no shell, arguments passed literally
//
// The string form is kept because cmd is deliberately a fragment of ImageMagick
// syntax — \( \), globs and quoting all have to keep working — and that is a
// choice the caller makes about their own command line. file is not: it is a
// path this library generated from a source filename, so it is quoted in the
// string form and is a plain argument in the array form. Prefer the array form
// in new code; it takes the shell out of the loop entirely.
module.exports = async ({ file }, cmd) => {
  if (Array.isArray(cmd)) {
    execFileSync('convert', [file, ...cmd, file]);
    return;
  }
  execSync(`convert ${quote(file)} ${cmd} ${quote(file)}`);
};
