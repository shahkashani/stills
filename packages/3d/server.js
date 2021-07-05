const express = require('express');
const app = express();
const { writeFileSync, existsSync, mkdirSync, readFileSync } = require('fs');
const { sync } = require('glob');
const { resolve, parse } = require('path');
const DIST_FOLDER = resolve(__dirname, './dist');
const MASKS_FOLDER = resolve(__dirname, './masks');
const DEFAULT_INPUT_FOLDER = resolve(__dirname, './input');
const OUTPUT_FOLDER = resolve(__dirname, './output');

const getImages = (folder) => {
  return sync('**/*.{jpg,jpeg,png,gif}', { cwd: folder }).map((image) => ({
    name: parse(image).base,
    url: `/${image}`,
    path: `${folder}/${image}`
  }));
};

module.exports = async ({ port = 8080, config, static = [] } = {}) => {
  let configObject;

  if (!existsSync(DEFAULT_INPUT_FOLDER)) {
    mkdirSync(DEFAULT_INPUT_FOLDER);
  }

  if (!existsSync(OUTPUT_FOLDER)) {
    mkdirSync(OUTPUT_FOLDER);
  }

  if (config) {
    console.log('Reading config', config);
    configObject = JSON.parse(readFileSync(config).toString());
    console.log(JSON.stringify(configObject, null, 2));
  } else {
    configObject = {
      images: getImages(DEFAULT_INPUT_FOLDER).map((image) => ({
        ...image,
        output: `${OUTPUT_FOLDER}/${image.name}`
      })),
      masks: getImages(MASKS_FOLDER),
      opacity: 1
    };
  }

  app.use(
    express.static(
      resolve(__dirname, './node_modules/@vladmandic/human/models')
    )
  );

  app.use(express.static(DEFAULT_INPUT_FOLDER));
  app.use(express.static(DIST_FOLDER));
  app.use(express.static(MASKS_FOLDER));

  static.forEach((s) => app.use(express.static(s)));

  app.use(express.json({ limit: '50mb' }));

  app.get('/config', (req, res) => {
    res.json(configObject);
  });

  app.post('/save', (req, res) => {
    const image = req.body.image;
    const output = req.body.output;
    writeFileSync(output, image, 'base64');
    console.log(`Saved ${output}`);
    res.json({
      path: output,
      url: `/${parse(output).name}`
    });
  });

  console.log(`👂 Listening on port ${port}`);
  const server = app.listen(port);

  const cleanup = async () => {
    server.close();
  };

  return { app, server, cleanup };
};
