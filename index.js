const { unlinkSync } = require('fs');

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
  getPostText = null,
  deleteAfterPosting = true
} = {}) => {
  const result = {
    filters: {},
    destinations: {},
    source: null,
    content: null
  };

  const tags = [];

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

    tags.push(output);
  }

  result.content = image;

  for (const filter of filters) {
    console.log(`\n🎨 Applying filter ${filter.name}`);
    const filterResult = await filter.apply(image);
    if (filterResult) {
      result.filters[filter.name] = filterResult;
    }
  }

  const postText = getPostText ? getPostText(result) : null;

  for (const destination of destinations) {
    console.log(`\n🚀 Publishing to ${destination.name}`);
    const response = await destination.publish(image, {
      tags,
      text: postText
    });
    if (response) {
      result.destinations[destination.name] = response;
    }
    console.log(
      `👀 Go check it out at ${'url' in response ? response.url : response}`
    );
  }

  if (destinations.length > 0 && deleteAfterPosting) {
    unlinkSync(image);
  }

  return result;
};

module.exports = {
  generate,
  filters: require('./lib/filters'),
  sources: require('./lib/sources'),
  content: require('./lib/content'),
  destinations: require('./lib/destinations'),
  validators: require('./lib/validators')
};
