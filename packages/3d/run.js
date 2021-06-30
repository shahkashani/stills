const runner = require('./runner');

async function run() {
  await runner.run();
  process.exit(0);
}

run();
