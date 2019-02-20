#! /usr/bin/env node
require('dotenv').config();

const path = require('path');
const fs = require('fs');
const fr = require('face-recognition');
const detector = fr.FaceDetector();
const recognizer = fr.FaceRecognizer();
const glob = require('glob');

const INPUT_FOLDER = path.resolve('./train');
const OUTPUT_FOLDER = path.resolve('./faces');

const argv = require('yargs')
  .usage('Usage: $0 <command> [options]')
  .default('name', 'face').argv;

const processFaces = async () => {
  const name = argv.name;
  const inputs = glob.sync(`${INPUT_FOLDER}/*.png`);
  const output = `${OUTPUT_FOLDER}/${name}.json`;
  console.log(`💪 Trainin "${name}"...'`);

  const faces = inputs.reduce((memo, input) => {
    const image = fr.loadImage(input);
    const faceRects = detector.locateFaces(image).map(res => res.rect);
    if (faceRects) {
      const faces = detector.getFacesFromLocations(image, faceRects, 150);
      memo.push(faces[0]);
    }
    return memo;
  }, []);

  recognizer.addFaces(faces, name);

  const modelState = recognizer.serialize();
  fs.writeFileSync(output, JSON.stringify(modelState));
};

processFaces();
