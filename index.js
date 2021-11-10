const { unlinkSync } = require('fs');
const { uniq, compact, map } = require('lodash');
const pressAnyKey = require('press-any-key');
const getImageInfo = require('./lib/utils/get-image-info');
const Image = require('./lib/stills/image');

const MAX_GENERATION_ATTEMPTS = 9;

class Stills {
  constructor({
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
  } = {}) {
    this.source = source;
    this.content = content;
    this.caption = caption;
    this.filters = filters;
    this.destinations = destinations;
    this.validators = validators;
    this.taggers = taggers;
    this.description = description;
    this.isPrompt = isPrompt;
    this.analysis = analysis;
    this.num = num;
    this.passthrough = passthrough;
  }

  async validate(images, validators) {
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
  }

  async generate() {
    this.result = {
      filters: {},
      destinations: {},
      taggers: {},
      source: null,
      tags: [],
      content: null,
      description: null
    };

    if (this.passthrough && this.destinations) {
      for (const destination of this.destinations) {
        console.log(`\n🚀 Passing through to to ${destination.name}`);
        if (destination.passthrough) {
          const response = await destination.passthrough(this.passthrough);
          if (response) {
            this.result.destinations[destination.name] = response;
          }
          console.log(
            `👀 Go check it out at ${
              'url' in response ? response.url : response
            }`
          );
        }
      }
      return this.result;
    }

    if (this.caption && this.caption.getEpisodeName) {
      console.log(`💬 Getting episode name from ${this.caption.name}`);
    }

    const episodeName =
      this.caption && this.caption.getEpisodeName
        ? await this.caption.getEpisodeName(await this.source.getAllNames())
        : null;

    const sourceResult = await this.source.get(episodeName);
    const { input, output, name } = sourceResult;

    this.result.source = sourceResult;

    let isValid = false;
    let images = null;
    let captions = [];
    let timestamps;
    let lengths;
    let numStills;

    for (let i = 0; !isValid && i <= MAX_GENERATION_ATTEMPTS; i++) {
      if (this.caption) {
        console.log(`💬 Getting captions from ${this.caption.name}`);
        const captionResults = await this.caption.get(name);
        captions = captionResults.captions;
        timestamps = captionResults.timestamps;
        lengths = captionResults.lengths;
      }
      numStills = captions.length || this.num || 1;
      images = this.content.generate(
        input,
        output,
        numStills,
        timestamps,
        lengths
      );
      isValid = await this.validate(images, this.validators);
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

    this.result.captions = captions;
    this.result.timestamps = timestamps;
    this.result.lengths = lengths;
    this.result.content = images;

    const imageInfo = (file) => getImageInfo(file);

    // I think this can happen conditionally, i.e. if there are any filters that need to be applied
    await this.prepare(images);

    if (this.analysis) {
      console.log(`🔬 Running image analysis with ${this.analysis.name}`);
      this.result.analysis = await this.analysis.get(images, imageInfo);
    }

    console.log('🌍 Results so far:', JSON.stringify(this.result, null, 2));

    if (this.isPrompt) {
      await pressAnyKey();
    }

    await this.applyFilters();
    await this.collapse();
    await this.applyPostFilters();

    let text = null;

    if (this.description) {
      console.log(`\n📯 Generating description with ${this.description.name}`);
      text = await this.description.get(images, this.result);
      if (text) {
        console.log(`🎉 Got description: ${text}`);
      }

      this.result.description = text;
    }

    const tags = [];

    for (const tagger of this.taggers) {
      const taggerResult = await tagger.get(this.result);
      if (Array.isArray(taggerResult)) {
        this.result.taggers[tagger.name] = taggerResult;
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

    this.result.tags = tags;

    if (this.isPrompt && this.destinations && this.destinations.length > 0) {
      await pressAnyKey();
    }

    for (const destination of this.destinations) {
      console.log(`\n🚀 Publishing to ${destination.name}`);
      const response = await destination.publish(
        images,
        {
          tags,
          text
        },
        this.result
      );
      if (response) {
        this.result.destinations[destination.name] = response;
      }
      console.log(
        `👀 Go check it out at ${'url' in response ? response.url : response}`
      );
    }

    return this.result;
  }

  async prepare(images) {
    this.images = await Promise.all(
      images.map(async (filename) => {
        const image = new Image({ filename });
        await image.prepare();
        return image;
      })
    );
  }

  async collapse() {
    for (const image of this.images) {
      await image.collapse();
    }
  }

  async applyFilters() {
    const result = this.result;
    const numImages = this.images.length;
    let numImage = 0;
    for (const image of this.images) {
      console.log(`🎨 Processing image ${numImage + 1}`);
      const frames = image.getFrames();
      const numFrames = frames.length;
      let numFrame = 0;
      for (const frame of frames) {
        console.log(`⮑  🎞  Frame ${numFrame + 1}`);
        for (const filter of this.filters) {
          if (filter.applyFrame) {
            console.log(`⮑  💅 ${filter.name}`);
            await filter.applyFrame(frame, {
              numFrame,
              numFrames,
              numImages,
              numImage,
              result
            });
            this.result.filters[filter.name] = true;
          }
        }
        numFrame += 1;
      }
      numImage += 1;
    }
  }

  async applyPostFilters() {
    const result = this.result;
    const numImages = this.images.length;
    let numImage = 0;
    for (const image of this.images) {
      console.log(`🎨 Post-processing image ${numImage + 1}`);
      for (const filter of this.filters) {
        if (filter.applyFrames) {
          console.log(`⮑  💅💅 ${filter.name}`);
          await filter.applyFrames(image.frames, {
            numImages,
            numImage,
            result
          });
          this.result.filters[filter.name] = true;
        }
      }
      numImage += 1;
    }
  }

  deleteStills() {
    const result = this.result;
    const files = Array.isArray(result)
      ? uniq(compact(map(result, 'content')))
      : result.content;

    if (!Array.isArray(files)) {
      return;
    }

    files.forEach((file) => {
      unlinkSync(file);
    });
  }
}

module.exports = {
  Stills: Stills,
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
