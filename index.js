const { unlinkSync } = require('fs');
const { uniq, compact, map } = require('lodash');
const pressAnyKey = require('press-any-key');
const Image = require('./lib/stills/image');
const measure = require('./lib/utils/measure');
const { Streaks } = require('./lib/validators');
const os = require('os');

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
    num = null,
    useGlyphs = false,
    minFaceConfidence = 0.3,
    startFrame = null,
    moderation = null,
    onFrameChange = null,
    onImageChange = null
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
    this.useGlyphs = useGlyphs;
    this.passthrough = passthrough;
    this.minFaceConfidence = minFaceConfidence;
    this.startFrame = startFrame;
    this.moderation = moderation;
    this.onFrameChange = onFrameChange;
    this.onImageChange = onImageChange;

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

  async generate({ isSmart = false } = {}) {
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

    if (isSmart) {
      await this.smartSetup();
    } else {
      await this.setup();
    }

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
      text = await this.description.get(
        this.images,
        this.result,
        this.useGlyphs
      );
      if (text) {
        console.log(`🎉 Got description: ${text}`);
      }

      this.result.description = text;
    }

    const tags = [];

    for (const tagger of this.taggers) {
      const taggerResult = await tagger.get(this.result, this.useGlyphs);
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
        this.result,
        this.useGlyphs
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
    if (this.moderation && captions.length > 0) {
      console.log('👩‍⚖️ Running moderation');
      if (!(await this.moderation.validate(captions))) {
        console.error('🤯 Caption did not pass validation:', captions);
        process.exit(1);
      }
    }
    const project = {
      source,
      images,
      lengths,
      timestamps,
      captions
    };
    console.log(project);
    await this.restore(project);
    return project;
  }

  async smartSetup({
    enableValidator = true,
    validatorOptions,
    framesOptions
  } = {}) {
    console.log(`✨ Running smart setup!`);

    const source = await this.getSource();
    const streaks = new Streaks(validatorOptions);
    const { input, output, name } = source;

    let captions = [];
    let startTime = null;

    if (this.caption) {
      console.log(`💬 Getting captions from ${this.caption.name}`);
      const captionResults = await this.caption.get(name);
      captions = captionResults.captions;
    }

    if (this.moderation && captions.length > 0) {
      console.log('👩‍⚖️ Running moderation');
      if (!(await this.moderation.validate(captions))) {
        console.error('🤯 Caption did not pass validation:', captions);
        process.exit(1);
      }
    }

    const results = [];
    const images = [];
    const numStills = captions.length || this.num || 1;
    const skipLength = (this.content.duration || 2) + this.content.secondsApart;

    if (this.startFrame) {
      const [content] = this.content.generate(input, output, 1);
      const image = new Image({
        framesOptions,
        filename: content.file,
        minFaceConfidence: this.minFaceConfidence
      });
      image.collect();
      console.log('🎉 Resuming from frame', this.startFrame);
      images.push(content);
      results.push(image);
    } else {
      while (results.length < numStills) {
        const timestamps = startTime ? [startTime] : undefined;
        const [content] = this.content.generate(input, output, 1, timestamps);

        if (!startTime) {
          startTime = content.time;
        }

        const image = new Image({
          framesOptions,
          filename: content.file,
          minFaceConfidence: this.minFaceConfidence
        });

        await image.prepare();

        if (!enableValidator || (await streaks.validate(image))) {
          console.log('🎉 This image is acceptable!');
          images.push(content);
          results.push(image);
        } else {
          console.log(
            `🧐 This image is not acceptable. Skipping to ${
              startTime + skipLength
            }s.`
          );
          image.delete();
        }
        startTime += skipLength;
      }
    }

    this.images = results;

    const project = {
      source,
      images,
      captions
    };

    await this.restore(project, false);
    return project;
  }

  async restore(
    { source, images, timestamps, lengths, captions },
    isPrepare = true
  ) {
    this.result.source = source;
    this.result.captions = captions;
    this.result.timestamps = timestamps;
    this.result.lengths = lengths;
    this.result.content = images;
    if (isPrepare) {
      await this.prepare(images);
    }
  }

  async prepare(images) {
    this.images = await Promise.all(
      images.map(async (content) => {
        const image = new Image({
          filename: content.file,
          minFaceConfidence: this.minFaceConfidence
        });
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

  async delete(deleteFramesOnly = false) {
    if (!this.images || this.images.length === 0) {
      return;
    }
    try {
      for (const image of this.images) {
        await image.delete(deleteFramesOnly);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async reset(skipCollapse) {
    for (const image of this.images) {
      await image.reset(skipCollapse);
    }
  }

  async applyFilters() {
    for (let numImage = 0; numImage < this.images.length; numImage += 1) {
      const image = this.images[numImage];
      await this.applyFrameFiltersForImage(image, numImage);
      await this.applyImageFiltersForImage(image, numImage);
      await measure('collapse', () => image.collapse());
      this.onImageChange?.(numImage);
    }
  }

  // @todo Deprecate this
  async applyFrameFilters() {
    let numImage = 0;
    for (const image of this.images) {
      this.applyFrameFiltersForImage(image, numImage);
      numImage += 1;
    }
  }

  // @todo Deprecate this
  async applyImageFilters() {
    let numImage = 0;
    for (const image of this.images) {
      this.applyFrameImageForImagep(image, numImage);
      numImage += 1;
    }
  }

  async applyFrameFiltersForImage(image, numImage) {
    const result = this.result;
    const numImages = this.images.length;
    const startFrame = this.startFrame || 0;

    console.log(`🎨 Processing image ${numImage + 1}`);
    const frames = image.getFrames();
    const numFrames = frames.length;

    const hasImageFilters =
      Array.isArray(this.imageFilters) &&
      Array.isArray(this.imageFilters[numImage]) &&
      this.imageFilters[numImage].length > 0;
    if (hasImageFilters) {
      console.log(
        '💅 This image has some specific filters',
        this.imageFilters[numImage]
      );
    }

    for (let numFrame = startFrame; numFrame < numFrames; numFrame += 1) {
      const frame = frames[numFrame];
      const now = Date.now();
      const percent = Math.floor((100 * numFrame) / numFrames);
      console.log(`🎞  Frame ${frame.index + 1} (${percent}%)`);

      if (this.filterSkipFrames.indexOf(numFrame) !== -1) {
        console.log('Skipping.');
        continue;
      }

      const filters = hasImageFilters
        ? [...this.imageFilters[numImage], ...this.filters]
        : this.filters;

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
        if (numFrame === 0 && filter.setup) {
          await measure(`${filter.name} setup`, () => filter.setup(data));
        }
        if (filter.applyFrame) {
          try {
            await measure(filter.name, () => filter.applyFrame(frame, data));
          } catch (err) {
            console.error(err);
          }
          this.result.filters[filter.name] = true;
        }
        // Can happen outside the loop once everything uses a buffer
        if (numFrame === numFrames - 1 && filter.teardown) {
          await measure(`${filter.name} teardown`, () => filter.teardown(data));
        }
      }
      if (
        this.filterCaption &&
        Array.isArray(result.captions) &&
        result.captions[numImage]
      ) {
        // @todo This should maybe iterate over the captions
        const imageCaptions = result.captions[numImage];
        const useCaption = Array.isArray(imageCaptions)
          ? imageCaptions[0]
          : imageCaptions;
        await measure('captions', () =>
          this.filterCaption.apply(frame, useCaption, data)
        );
      }
      console.log(`\n🏁 Total frame time: ${Date.now() - now}ms`);
      const osFreeMem = os.freemem();
      const allFreeMem = osFreeMem / (1024 * 1024);
      console.log(`🏁 Total free memory: ${Math.round(allFreeMem)}mb`);
      this.onFrameChange?.(numImage, numFrame);
    }
  }

  async applyImageFiltersForImage(image, numImage) {
    const hasImageFilter = this.filters.find((filter) => filter.applyImage);
    if (!hasImageFilter) {
      return;
    }
    const result = this.result;
    const numImages = this.images.length;
    console.log(`🎨 Applying image filter to image ${numImage + 1}`);
    for (const filter of this.filters) {
      if (filter.applyImage) {
        try {
          await measure(filter.name, () =>
            filter.applyImage(image, {
              numImages,
              numImage,
              result
            })
          );
        } catch (err) {
          console.error(err);
        }
        this.result.filters[filter.name] = true;
      }
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

  replaceImage(index, newFileName) {
    this.images[index].replace(newFileName);
  }

  replaceFrame(index, frame, newFileName) {
    this.images[index].replaceFrame(frame, newFileName);
  }

  async deleteFrame(index, frame) {
    console.log(`🗑 Deleting frame ${frame} of image ${index}`);
    await this.images[index].deleteFrame(frame);
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
  captions: require('./lib/captions'),
  moderation: require('./lib/moderation')
};
