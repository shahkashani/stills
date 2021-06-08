const { unlinkSync } = require('fs');
const { uniq, compact, map } = require('lodash');
const pressAnyKey = require('press-any-key');
const getImageInfo = require('./lib/utils/get-image-info');

const MAX_GENERATION_ATTEMPTS = 9;

const validate = async (images, validators) => {
  if (validators.length === 0) {
    return true;
  }
  const results = await Promise.all(
    validators.map(async (validator) => {
      for (const image of images) {
        console.log(`🔍 Validating (${validator.name}) ${image}`);
        if (!(await validator.validate(image))) {
          console.log('😵 Validation failed');
          return false;
        } else {
          console.log('👍 Validation passed');
        }
      }
      return true;
    })
  );
  return results.every((result) => result);
};

const generate = async ({
  source,
  content,
  caption,
  filters = [],
  destinations = [],
  validators = [],
  taggers = [],
  description = null,
  isPrompt = false,
  analysis = null,
  passthrough = null,
  num = null
} = {}) => {
  const result = {
    filters: {},
    destinations: {},
    taggers: {},
    source: null,
    tags: [],
    content: null,
    description: null
  };

  if (passthrough && destinations) {
    for (const destination of destinations) {
      console.log(`\n🚀 Passing through to to ${destination.name}`);
      if (destination.passthrough) {
        const response = await destination.passthrough(passthrough);
        if (response) {
          result.destinations[destination.name] = response;
        }
        console.log(
          `👀 Go check it out at ${'url' in response ? response.url : response}`
        );
      }
    }
    return result;
  }

  const sourceResult = await source.get();
  const { input, output, name } = sourceResult;

  result.source = sourceResult;

  let isValid = false;
  let images = null;
  let captions;
  let timestamps;
  let numStills;

  for (let i = 0; !isValid && i <= MAX_GENERATION_ATTEMPTS; i++) {
    const captionResults = await caption.get(name);
    captions = captionResults.captions;
    timestamps = captionResults.timestamps;
    numStills = captions.length || num;
    images = content.generate(input, output, numStills, timestamps);
    isValid = await validate(images, validators);
    if (!isValid) {
      if (i === MAX_GENERATION_ATTEMPTS) {
        console.log(`\n📯 Giving up on validators, sorry.`);
      } else {
        for (const image of images) {
          unlinkSync(image);
        }
        images = null;
        captions = [];
        timestamps = [];
      }
    }
  }

  result.captions = captions;
  result.timestamps = timestamps;
  result.content = images;

  const imageInfo = (file) => getImageInfo(file);

  if (analysis) {
    console.log(`🔬 Running image analysis with ${analysis.name}`);
    result.analysis = await analysis.get(images, imageInfo);
  }

  console.log('🌍 Results so far:', JSON.stringify(result, null, 2));

  if (isPrompt) {
    await pressAnyKey();
  }

  let i = 0;
  const numImages = images.length;
  for (const image of images) {
    for (const filter of filters) {
      console.log(`🎨 Applying filter ${filter.name} (image ${i + 1})`);
      await filter.apply(image, imageInfo, i, numImages, result);
      result.filters[filter.name] = true;
    }
    i += 1;
  }

  let text = null;

  if (description) {
    console.log(`\n📯 Generating description with ${description.name}`);
    text = await description.get(images, result);
    if (text) {
      console.log(`🎉 Got description: ${text}`);
    }

    result.description = text;
  }

  const tags = [];

  for (const tagger of taggers) {
    const taggerResult = await tagger.get(result);
    if (Array.isArray(taggerResult)) {
      result.taggers[tagger.name] = taggerResult;
      if (taggerResult.length > 0) {
        console.log(
          `🏷️  Tagging using ${tagger.name}: ${taggerResult.join(', ')}`
        );
        tags.push.apply(tags, taggerResult);
      }
    } else {
      console.log(
        `🤷 Tagger ${tagger.name} did not return an array:`,
        taggerResult
      );
    }
  }

  result.tags = tags;

  if (isPrompt && destinations && destinations.length > 0) {
    await pressAnyKey();
  }

  for (const destination of destinations) {
    console.log(`\n🚀 Publishing to ${destination.name}`);
    const response = await destination.publish(
      images,
      {
        tags,
        text
      },
      result
    );
    if (response) {
      result.destinations[destination.name] = response;
    }
    console.log(
      `👀 Go check it out at ${'url' in response ? response.url : response}`
    );
  }

  return result;
};

const generateChain = async (configs) => {
  const results = [];
  let lastResult = null;
  for (let config of configs) {
    if (typeof config === 'function') {
      config = await config(lastResult, results);
    }
    lastResult = config ? await generate(config) : null;
    results.push(lastResult);
  }
  return results;
};

const deleteStills = (results) => {
  const files = Array.isArray(results)
    ? uniq(compact(map(results, 'content')))
    : results.content;

  if (!Array.isArray(files)) {
    return;
  }

  files.forEach((file) => {
    unlinkSync(file);
  });
};

module.exports = {
  generate,
  generateChain,
  deleteStills,
  filters: require('./lib/filters'),
  sources: require('./lib/sources'),
  content: require('./lib/content'),
  destinations: require('./lib/destinations'),
  validators: require('./lib/validators'),
  taggers: require('./lib/taggers'),
  descriptions: require('./lib/descriptions'),
  analysis: require('./lib/analysis'),
  utils: require('./lib/utils'),
  captions: require('./lib/captions')
};
