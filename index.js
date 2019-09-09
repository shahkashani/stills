const { unlinkSync } = require('fs');
const { uniq, compact, map } = require('lodash');
const { getImageInfo } = require('./lib/utils');

const MAX_GENERATION_ATTEMPTS = 10;

const validate = async (image, validators) => {
  if (validators.length === 0) {
    return true;
  }
  const results = await Promise.all(
    validators.map(async validator => {
      console.log(`\n🔍 Validating using ${validator.name}`);
      const result = await validator.validate(image);
      if (!result) {
        console.log(`😵 Validation failed!\n`);
      }
      return result;
    })
  );
  return results.every(result => result);
};

const generate = async ({
  source,
  content,
  image = null,
  filters = [],
  destinations = [],
  validators = [],
  taggers = [],
  globals = [],
  description = null
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

  if (!image) {
    const sourceResult = await source.get();
    const { input, output } = sourceResult;
    result.source = sourceResult;

    let isValid = false;

    for (let i = 0; !isValid && i < MAX_GENERATION_ATTEMPTS; i++) {
      image = content.generate(input, output);
      isValid = await validate(image, validators);
      if (!isValid) {
        unlinkSync(image);
        image = null;
      }
    }
    if (!image) {
      console.log('\n🤷 Giving up on the validators, sorry!');
      image = content.generate(input, output);
    }
  }

  result.content = image;

  let imageInfo = getImageInfo(image);

  let globalsData = await globals.reduce(async (memoFn, globalsPlugin) => {
    const memo = await memoFn;
    console.log(`\n📯 Getting data ${globalsPlugin.name}`);
    const result = await globalsPlugin.get(image, imageInfo);
    if (result) {
      memo[globalsPlugin.name] = result;
    }
    return memo;
  }, Promise.resolve({}));

  console.log('🌍 Globals data:', JSON.stringify(globalsData));

  result.globals = globalsData;

  let newImageInfo;

  for (const filter of filters) {
    console.log(`\n🎨 Applying filter ${filter.name}`);
    result.filters[filter.name] = await filter.apply(
      image,
      imageInfo,
      globalsData
    );
    // Move scenes out of globals, I guess, since filters can change that stuff
    // Maybe just put it into imageInfo since that's much easier to regenerate and pass down
    newImageInfo = getImageInfo(image);
    if (newImageInfo.numFrames !== imageInfo.numFrames) {
      console.log('🌍 Hotfix: gotta update globals!');
      imageInfo = newImageInfo;
      globalsData = await globals.reduce(async (memoFn, globalsPlugin) => {
        const memo = await memoFn;
        const result = await globalsPlugin.get(image, imageInfo);
        if (result) {
          memo[globalsPlugin.name] = result;
        }
        return memo;
      }, Promise.resolve({}));
    }
  }

  let text = null;

  if (description) {
    console.log(`\n📯 Generating description with ${description.name}`);
    text = await description.get(image, globalsData);
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

  for (const destination of destinations) {
    console.log(`\n🚀 Publishing to ${destination.name}`);
    const response = await destination.publish(image, {
      tags,
      text
    });
    if (response) {
      result.destinations[destination.name] = response;
    }
    console.log(
      `👀 Go check it out at ${'url' in response ? response.url : response}`
    );
  }

  return result;
};

const generateChain = async configs => {
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

const deleteStills = results => {
  const files = Array.isArray(results)
    ? uniq(compact(map(results, 'content')))
    : [results.content];
  files.forEach(file => {
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
