const { unlinkSync } = require('fs');
const { uniq, compact, map } = require('lodash');
const pressAnyKey = require('press-any-key');
const getImageInfo = require('./lib/utils/get-image-info');

const MAX_GENERATION_ATTEMPTS = 10;

const validate = async (images, validators) => {
  if (validators.length === 0) {
    return true;
  }
  const results = await Promise.all(
    validators.map(async (validator) => {
      console.log(`\n🔍 Validating using ${validator.name}`);
      const result = await validator.validate(images);
      if (!result) {
        console.log(`😵 Validation failed!\n`);
      }
      return result;
    })
  );
  return results.every((result) => result);
};

const generate = async ({
  source,
  content,
  images = null,
  filters = [],
  destinations = [],
  validators = [],
  taggers = [],
  globals = [],
  description = null,
  isPrompt = false,
  passthrough = null,
  ask = null,
} = {}) => {
  const result = {
    filters: {},
    destinations: {},
    taggers: {},
    globals: {},
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

  if (!images) {
    const sourceResult = await source.get();
    const { input, output } = sourceResult;
    result.source = sourceResult;

    let isValid = false;

    for (let i = 0; !isValid && i < MAX_GENERATION_ATTEMPTS; i++) {
      images = content.generate(input, output);
      isValid = await validate(images, validators);
      if (!isValid) {
        for (const image of images) {
          unlinkSync(image);
        }
        images = null;
      }
    }
    if (!images) {
      console.log('\n🤷 Giving up on the validators, sorry!');
      images = content.generate(input, output);
    }
  }

  result.content = images;

  const imageInfo = (file) => getImageInfo(file);

  const globalsData = await globals.reduce(async (memoFn, globalsPlugin) => {
    const memo = await memoFn;
    console.log(`\n📯 Getting data ${globalsPlugin.name}`);
    const result = await globalsPlugin.get(images, imageInfo, memo);
    if (result) {
      memo[globalsPlugin.name] = result;
    }
    return memo;
  }, Promise.resolve({}));

  console.log('🌍 Globals data:', JSON.stringify(globalsData, null, 2));

  result.globals = globalsData;

  if (isPrompt) {
    await pressAnyKey();
  }

  let i = 0;
  for (const image of images) {
    for (const filter of filters) {
      console.log(`🎨 Applying filter ${filter.name} (image ${i + 1})`);
      await filter.apply(image, imageInfo, globalsData, i);
      result.filters[filter.name] = true;
    }
    i += 1;
  }

  let text = null;

  if (description) {
    console.log(`\n📯 Generating description with ${description.name}`);
    text = await description.get(images, globalsData);
    if (text) {
      console.log(`🎉 Got description: ${text}`);
    }

    result.description = text;
  }

  const tags = [];

  for (const tagger of taggers) {
    const taggerResult = await tagger.get(result, globalsData);
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
      globalsData
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
  globals: require('./lib/globals')
};
