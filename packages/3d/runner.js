const createServer = require('./server');
const puppeteer = require('puppeteer');
const { resolve } = require('path');
const createConfig = require('./utils/create-config');

const PORT = '1234';
const URL = `http://localhost:${PORT}`;
const DONE_EVENT = 'done';

async function run({ config, runnerArgs = [] } = {}) {
  const configFolder = resolve(__dirname, 'runner');
  const [configFileName, cleanupConfig] = await createConfig(
    configFolder,
    config
  );
  return new Promise(async (resolve) => {
    const { cleanup } = await createServer({
      port: PORT,
      config: configFileName,
      static: [configFolder]
    });
    const browser = await puppeteer.launch({
      args: runnerArgs
    });
    const page = await browser.newPage();
    await page.goto(URL);
    page.on('metrics', async (event) => {
      const { title } = event;
      if (title === DONE_EVENT) {
        await browser.close();
        await cleanupConfig();
        await cleanup();
        resolve();
      }
    });
  });
}

module.exports = { run };
