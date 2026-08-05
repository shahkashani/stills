const { exec } = require('shelljs');
const { execFileSync } = require('child_process');

// Two calling conventions:
//
//   execCmd('ffmpeg -i "foo.mp4" ...')        legacy, goes through a shell
//   execCmd('ffmpeg', ['-i', 'foo.mp4', ...]) no shell, arguments passed literally
//
// Prefer the second whenever any part of the command comes from outside this
// module — a filename, a path, anything a caller supplied. With a shell in the
// loop, quoting a value does not make it safe: double quotes stop word-splitting
// but not command substitution, so `$(...)` inside a filename still executes.
module.exports = execCmd = (cmd, args) => {
  if (!cmd) {
    return;
  }

  if (Array.isArray(args)) {
    try {
      return execFileSync(cmd, args, { encoding: 'utf8' });
    } catch (err) {
      const stderr = err.stderr ? err.stderr.toString() : err.message;
      console.log(`🐞 Oops: ${stderr}\n> ${cmd} ${args.join(' ')}`);
      return '';
    }
  }

  const result = exec(cmd, { silent: true });
  if (result.code !== 0) {
    console.log(`🐞 Oops: ${result.stderr}\n> ${cmd}`);
  }
  return result.stdout;
};
