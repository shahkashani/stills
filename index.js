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
  filters = [],
  destinations = [],
  validators = [],
  getPostText = null
} = {}) => {
  const { input, output } = await source.get();
  const filterOutput = {};

  let isValid = false;
  let image = null;

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

  for (const filter of filters) {
    console.log(`\n🎨 Apply filter ${filter.name}`);
    filterOutput[filter.name] = await filter.apply(image);
  }

  let postText;
  if (getPostText) {
    console.log('\n🎁 Generating caption');
    postText = await getPostText(filterOutput);
  }

  for (const destination of destinations) {
    console.log(`\n🚀 Publishing to ${destination.name}`);
    const url = await destination.publish(image, {
      text: postText,
      tags: [output]
    });
    console.log(`👀 Go check it out at ${url}`);
  }

  if (destinations.length > 0) {
    unlinkSync(image);
  }
};

module.exports = {
  generate,
  filters: require('./lib/filters'),
  sources: require('./lib/sources'),
  content: require('./lib/content'),
  destinations: require('./lib/destinations'),
  validators: require('./lib/validators')
};
