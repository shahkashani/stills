const fetch = require('node-fetch');
const { sample, shuffle } = require('lodash');
const sharp = require('../utils/sharp');

const API = 'https://collectionapi.metmuseum.org/public/collection/v1';

// Replaces one image of a set with a public domain artwork from the
// Metropolitan Museum of Art.
//
// The Met rather than Cleveland or the Art Institute of Chicago because its
// pool is far bigger - "egg" returns 1094 works against Cleveland's 63 - and
// its image host serves anyone. AIC's CDN 403s any client that doesn't claim
// to be a browser, and impersonating one to get around that isn't a dependency
// worth having.
class FilterArtAttack {
  constructor({
    query,
    medium = null,
    index = null,
    skipFirst = true,
    poolSize = 100,
    maxChecks = 25,
    matchOrientation = true,
    allowSingle = false,
    fit = 'cover',
    delay = 200,
    userAgent = 'stills (https://github.com/shahkashani/stills)'
  } = {}) {
    this.query = query;
    this.medium = medium;
    this.index = index;
    this.skipFirst = skipFirst;
    this.poolSize = poolSize;
    this.maxChecks = maxChecks;
    this.matchOrientation = matchOrientation;
    this.allowSingle = allowSingle;
    this.fit = fit;
    this.delay = delay;
    this.userAgent = userAgent;
    this.artwork = null;
  }

  get name() {
    return 'art-attack';
  }

  getQuery() {
    return Array.isArray(this.query) ? sample(this.query) : this.query;
  }

  getTargetIndex(numImages) {
    if (typeof this.index === 'number') {
      return this.index % numImages;
    }
    const first = this.skipFirst && numImages > 1 ? 1 : 0;
    return first + Math.floor(Math.random() * (numImages - first));
  }

  wait() {
    return new Promise((resolve) => setTimeout(resolve, this.delay));
  }

  async get(url) {
    const response = await fetch(url, {
      headers: { 'User-Agent': this.userAgent }
    });
    // The Met sits behind a WAF that answers bursts with an HTML 403, so a
    // failed response is not necessarily JSON.
    if (!response.ok) {
      throw new Error(`The Met responded with ${response.status}`);
    }
    return response.json();
  }

  // Deliberately no hasImages=true. That parameter looks helpful but injects
  // the same fixed 128 objects into every result set - two different nonsense
  // queries come back with byte-identical IDs - so most of what it returns has
  // nothing to do with the query. Searching without it gives an order of
  // magnitude more results, honestly ranked, and isUsable drops the ones with
  // no picture anyway.
  async search(query) {
    const params = new URLSearchParams({
      q: query,
      ...(this.medium ? { medium: this.medium } : {})
    });
    const body = await this.get(`${API}/search?${params}`);
    // objectIDs comes back null rather than empty when nothing matches.
    return body.objectIDs || [];
  }

  // The Met gives no pixel dimensions, but it does give the physical
  // measurements of the work, which track the image's orientation.
  getOrientation(object) {
    const elements = object.measurements || [];
    const preferred = ['Image', 'Sheet', 'Overall', 'Mount', 'Plate'];
    const named = elements.reduce(
      (all, element) =>
        Object.assign(all, {
          [element.elementName]: element.elementMeasurements || {}
        }),
      {}
    );
    const names = preferred.concat(Object.keys(named));
    for (const name of names) {
      const { Height, Width } = named[name] || {};
      if (Height && Width) {
        return Width > Height ? 'landscape' : 'portrait';
      }
    }
    return null;
  }

  isUsable(object, isLandscape) {
    if (!object || !object.isPublicDomain || !object.primaryImage) {
      return false;
    }
    if (!this.matchOrientation) {
      return true;
    }
    const orientation = this.getOrientation(object);
    // Unknown orientation is let through - "cover" still fills the frame, it
    // just crops harder than it would otherwise.
    const wanted = isLandscape ? 'landscape' : 'portrait';
    return !orientation || orientation === wanted;
  }

  // Results come back ranked, so shuffling the whole list would throw the
  // ranking away. Shuffling within the top slice keeps the results on topic
  // while still giving a different one each run.
  async findArtwork(objectIds, isLandscape) {
    const ids = shuffle(objectIds.slice(0, this.poolSize)).slice(
      0,
      this.maxChecks
    );
    for (const id of ids) {
      let object = null;
      try {
        object = await this.get(`${API}/objects/${id}`);
      } catch (err) {
        // A dead ID or a throttled request - try the next one.
      }
      if (this.isUsable(object, isLandscape)) {
        return object;
      }
      await this.wait();
    }
    return null;
  }

  async getBuffer(url, width, height) {
    const response = await fetch(url, {
      headers: { 'User-Agent': this.userAgent }
    });
    if (!response.ok) {
      throw new Error(`Could not download artwork (${response.status})`);
    }
    const buffer = await response.buffer();
    return sharp(buffer).resize(width, height, { fit: this.fit }).toBuffer();
  }

  // Runs as a frame filter rather than an image filter so that the caption,
  // which the harness draws at the end of each frame's turn, lands on top of
  // the artwork instead of underneath the replacement.
  async applyFrame(frame, { image, numImage, numImages, numFrames }) {
    // Pick once per set. Normally that's on the first image, but don't rely on
    // ever being handed it.
    if (numImage === 0 || typeof this.targetIndex !== 'number') {
      this.targetIndex = this.getTargetIndex(numImages);
      this.artwork = null;
    }

    if (numImage !== this.targetIndex) {
      return;
    }

    if (numImages < 2 && !this.allowSingle) {
      console.log('🖼  Only one image in this set, leaving it alone.');
      return;
    }

    if (numFrames > 1) {
      console.log('🖼  This image is animated, art attack only does stills.');
      return;
    }

    const { width, height } = image.getInfo();
    const query = this.getQuery();

    try {
      const objectIds = await this.search(query);

      if (objectIds.length === 0) {
        console.log(`🖼  The Met has nothing for "${query}", moving on.`);
        return;
      }

      const object = await this.findArtwork(objectIds, width > height);

      if (!object) {
        console.log(
          `🖼  Nothing usable in ${objectIds.length} results for "${query}".`
        );
        return;
      }

      frame.buffer = await this.getBuffer(object.primaryImage, width, height);

      this.artwork = {
        query,
        title: object.title,
        artist: object.artistDisplayName || null,
        date: object.objectDate,
        medium: object.medium,
        url: object.objectURL
      };

      image.setData('artwork', this.artwork);

      console.log(
        `🖼  Replaced image ${numImage + 1} of ${numImages} with "${
          this.artwork.title
        }"${this.artwork.artist ? ` by ${this.artwork.artist}` : ''} (${
          objectIds.length
        } results)`
      );
    } catch (err) {
      console.log(`🖼  Could not get art for "${query}": ${err.message}`);
    }
  }
}

module.exports = FilterArtAttack;
