const express = require('express');
const app = express();
const { writeFileSync, existsSync, mkdirSync } = require('fs');
const { sync } = require('glob');
const { resolve, parse } = require('path');
const Bundler = require('parcel-bundler');
const DIST_FOLDER = resolve(__dirname, './dist');

module.exports = async ({ port = 8080, input } = {}) => {
  const INPUT_FOLDER = input || resolve(__dirname, './input');
  const OUTPUT_FOLDER = resolve(__dirname, './output');

  if (!existsSync(INPUT_FOLDER)) {
    mkdirSync(INPUT_FOLDER);
  }

  if (!existsSync(OUTPUT_FOLDER)) {
    mkdirSync(OUTPUT_FOLDER);
  }

  const bundler = new Bundler(resolve(__dirname, './index.html'), {});

  app.use(
    express.static(
      resolve(__dirname, './node_modules/@vladmandic/human/models')
    )
  );
  app.use(express.static(INPUT_FOLDER));
  app.use(express.static(DIST_FOLDER));

  app.use(express.json({ limit: '50mb' }));

  app.get('/inputs', (req, res) => {
    res.json(sync('**/*.{jpg,jpeg,png,gif}', { cwd: INPUT_FOLDER }));
  });

  app.post('/save', (req, res) => {
    const filename = req.body.filename || 'out.png';
    const image = req.body.image;
    const { name } = parse(filename);
    const output = `${OUTPUT_FOLDER}/${name}.png`;
    writeFileSync(output, image, 'base64');
    console.log(`Saved ${output}`);
    res.sendStatus(200);
  });

  app.use(bundler.middleware());

  return new Promise((resolve) => {
    bundler.on('bundled', () => {
      const server = app.listen(port);
      console.log(`👂 Listening on port ${port}`);
      resolve(server);
    });
  });
};
