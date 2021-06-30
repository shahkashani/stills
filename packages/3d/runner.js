const server = require('./server');
const puppeteer = require('puppeteer');
const { copyFileSync, unlinkSync } = require('fs');
const { sync } = require('glob');
const { parse, resolve } = require('path');

const PORT = '1234';
const URL = `http://localhost:${PORT}`;
const DONE_EVENT = 'done';

async function run({ files } = {}) {
  const inFolder = resolve(__dirname, 'runner');
  const outFolder = resolve(__dirname, 'output');

  if (files && files.length > 0) {
    const existingFiles = sync(`${inFolder}/*`);
    existingFiles.forEach((file) => unlinkSync(file));
    for (const file of files) {
      const { base } = parse(file);
      copyFileSync(file, `${inFolder}/${base}`);
    }
  }
  return new Promise(async (resolve) => {
    const app = await server({ port: PORT, input: inFolder });
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(URL);
    page.on('metrics', ({ title }) => {
      if (title === DONE_EVENT) {
        browser.close();
        app.close();
        if (files && files.length > 0) {
          for (const file of files) {
            const { base } = parse(file);
            copyFileSync(`${outFolder}/${base}`, file);
          }
        }
        resolve();
      }
    });
  });
}

module.exports = { run };
