const { unlinkSync } = require('fs');
const { uniq, compact, map } = require('lodash');
const pressAnyKey = require('press-any-key');
const Image = require('./lib/stills/image');

const MAX_GENERATION_ATTEMPTS = 9;

class Stills {
  constructor({
    source,
    content,
    caption,
    filterCaption,
    filters = [],
    filterSkipFrames = [],
    imageFilters = [],
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
    this.filterCaption = filterCaption;
    this.filters = filters;
    this.imageFilters = imageFilters;
    this.filterSkipFrames = filterSkipFrames;
    this.destinations = destinations;
    this.validators = validators;
    this.taggers = taggers;
    this.description = description;
    this.isPrompt = isPrompt;
    this.analysis = analysis;
    this.num = num;
    this.passthrough = passthrough;

    this.result = {
      filters: {},
      destinations: {},
      taggers: {},
      source: null,
      tags: [],
      content: null,
      description: null
    };
  }

  async generate() {
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

    await this.setup();

    if (this.isPrompt) {
      await pressAnyKey();
    }

    await this.applyFilters();
    await this.generateMetaInfo();

    if (this.isPrompt && this.destinations && this.destinations.length > 0) {
      await pressAnyKey();
    }

    await this.post();
    return this.result;
  }

  async generateMetaInfo() {
    let text = null;

    if (this.analysis) {
      console.log(`🔬 Running image analysis with ${this.analysis.name}`);
      this.result.analysis = await this.analysis.get(this.images);
      console.log('🌍 Analysis results:', JSON.stringify(this.result, null, 2));
    }

    if (this.description) {
      console.log(`\n📯 Generating description with ${this.description.name}`);
      text = await this.description.get(this.images, this.result);
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
  }

  async post() {
    const { tags, description } = this.result;
    for (const destination of this.destinations) {
      console.log(`\n🚀 Publishing to ${destination.name}`);
      const response = await destination.publish(
        this.images,
        {
          tags,
          text: description
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
  }

  async validate(images, validators) {
    if (validators.length === 0) {
      return true;
    }
    const results = await Promise.all(
      validators.map(async (validator) => {
        for (const content of images) {
          const image = content.file;
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

  async getEpisodeName() {
    if (!this.caption || !this.caption.getEpisodeName) {
      return null;
    }
    console.log(`💬 Getting episode name from ${this.caption.name}`);
    return await this.caption.getEpisodeName(await this.source.getAllNames());
  }

  async getSource() {
    const episodeName = await this.getEpisodeName();
    return await this.source.get(episodeName);
  }

  async generateImages(input, output, name) {
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
            unlinkSync(image.file);
          }
          images = null;
          captions = [];
          timestamps = [];
        }
      }
    }
    return {
      captions,
      timestamps,
      lengths,
      images
    };
  }

  async setup() {
    const source = await this.getSource();
    const { input, output, name } = source;
    const { images, timestamps, lengths, captions } = await this.generateImages(
      input,
      output,
      name
    );
    const project = {
      source,
      images,
      lengths,
      timestamps,
      captions
    };
    await this.restore(project);
    return project;
  }

  async restore({ source, images, timestamps, lengths, captions }) {
    this.result.source = source;
    this.result.captions = captions;
    this.result.timestamps = timestamps;
    this.result.lengths = lengths;
    this.result.content = images;
    await this.prepare(images);
  }

  async prepare(images) {
    this.images = await Promise.all(
      images.map(async (content) => {
        const image = new Image({ filename: content.file });
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

  async delete() {
    for (const image of this.images) {
      await image.delete();
    }
  }

  async reset() {
    for (const image of this.images) {
      await image.reset();
    }
  }

  async applyFilters() {
    await this.applyFrameFilters();
    await this.collapse();
    await this.applyFramesFilters();
  }

  async applyFrameFilters() {
    const result = this.result;
    const numImages = this.images.length;
    let numImage = 0;
    for (const image of this.images) {
      console.log(`🎨 Processing image ${numImage + 1}`);
      const frames = image.getFrames();
      const numFrames = frames.length;
      for (let numFrame = 0; numFrame < numFrames; numFrame += 1) {
        console.log(`⮑  🎞  Frame ${numFrame + 1}`);

        if (this.filterSkipFrames.indexOf(numFrame) !== -1) {
          console.log('Skipping.');
          continue;
        }

        const filters =
          Array.isArray(this.imageFilters) &&
          Array.isArray(this.imageFilters[numImage])
            ? [...this.imageFilters[numImage], ...this.filters]
            : this.filters;

        const frame = frames[numFrame];
        const prevFrame = numFrame > 0 ? frames[numFrame - 1] : null;

        const data = {
          image,
          numFrame,
          numFrames,
          numImages,
          numImage,
          prevFrame
        };
        for (const filter of filters) {
          if (filter.applyFrame) {
            console.log(`⮑  💅 ${filter.name}`);
            await filter.applyFrame(frame, data);
            this.result.filters[filter.name] = true;
          }
        }
        if (this.filterCaption) {
          // @todo This should maybe iterate over the captions
          // Also, this might have to be applied after applyFramesFilters
          // since right now some filters can run after the captions
          const caption = result.captions[numImage][0];
          const captionResult = await this.filterCaption.apply(
            frame,
            caption,
            data
          );
          if (captionResult) {
            console.log(`✍️  Changing captions to`, captionResult);
            this.result.captions[numImage] = [captionResult];
          }
        }
      }
      numImage += 1;
    }
  }

  async applyFramesFilters() {
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
      : map(result.content, 'file');

    if (!Array.isArray(files)) {
      return;
    }

    files.forEach((file) => {
      unlinkSync(file);
    });
  }

  async replaceImage(index, newFileName) {
    await this.images[index].replace(newFileName);
  }

  async replaceFrame(index, frame, newFileName) {
    await this.images[index].replaceFrame(frame, newFileName);
  }
}

module.exports = {
  Stills,
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
