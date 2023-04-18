process.env.TF_CPP_MIN_LOG_LEVEL = 2;

const Human = require('@vladmandic/human').default;
const { resolve } = require('path');

const MODELS_FOLDER = resolve(__dirname, '../../../models');

const config = {
  debug: false,
  modelBasePath: `file://${MODELS_FOLDER}`,
  body: { enabled: false, modelPath: 'file://models.json' },
  face: {
    detector: {
      maxDetected: 7,
      minConfidence: 0.01
    }
  },
  mesh: {
    keepInvalid: true
  },
  hand: { enabled: false },
  object: { enabled: false }
};

let human = null;

const get = () => {
  if (human) {
    return human;
  }
  human = new Human(config);
  return human;
};

module.exports = {
  get
};
