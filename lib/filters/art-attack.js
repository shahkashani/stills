const fetch = require('node-fetch');
const nlp = require('compromise');
const { sample, shuffle } = require('lodash');
const sharp = require('../utils/sharp');

const API = 'https://collectionapi.metmuseum.org/public/collection/v1';

// Any term that matches nothing on its own, used to find out which results a
// filtered search returns regardless of the query.
const NOISE_QUERY = 'zzqqxxnothing';

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
    useCaption = true,
    captionMaxResults = 5000,
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
    this.useCaption = useCaption;
    this.captionMaxResults = captionMaxResults;
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

  getCaption(result, numImage) {
    const captions = result && result.captions;
    if (!Array.isArray(captions)) {
      return null;
    }
    const caption = captions[numImage];
    // A single image's captions can itself be an array, same as the harness
    // assumes when it draws them.
    return Array.isArray(caption) ? caption.join(' ') : caption;
  }

  // Longest word wins, as a rough stand-in for the most specific one. There is
  // deliberately no list of words to avoid here: captionMaxResults already
  // rejects the vague ones on the evidence, since "piece" matches 23859 works
  // and "now" 11929, and a hand-kept list would only rot.
  //
  // No singularizing either - the Met stems queries itself, so "chilies" and
  // "chili" return the same 28 results, and compromise turns that particular
  // word into "chily" anyway.
  getTerms(selection) {
    return selection
      .out('array')
      .map((word) => word.replace(/[^a-z-]/g, '').replace(/^-+|-+$/g, ''))
      .filter((word) => word.length > 2)
      .sort((a, b) => b.length - a.length);
  }

  // Nouns first, then adjectives - "Ooh! You're heavy." has no noun in it but
  // "heavy" is a perfectly good thing to go looking for. Roughly half of
  // spoken captions still have nothing usable, which is why the configured
  // query stays around as a fallback.
  getCaptionQuery(caption) {
    if (!caption) {
      return null;
    }
    const doc = nlp(String(caption).toLowerCase());
    // nouns() hands back whole phrases ("combo of the sofrito"), which search
    // badly. Matching the individual noun terms gives single words instead.
    const nouns = this.getTerms(
      // "yours" and friends are tagged Noun, not Pronoun.
      doc.match('#Noun').not('#Pronoun').not('#Possessive')
    );
    if (nouns.length > 0) {
      return { term: nouns[0], kind: 'noun' };
    }
    const adjectives = this.getTerms(doc.match('#Adjective'));
    if (adjectives.length > 0) {
      return { term: adjectives[0], kind: 'adjective' };
    }
    return null;
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
  async searchIds(query, medium) {
    const params = new URLSearchParams({
      q: query,
      ...(medium ? { medium } : {})
    });
    const body = await this.get(`${API}/search?${params}`);
    // objectIDs comes back null rather than empty when nothing matches.
    return body.objectIDs || [];
  }

  // One value per search. The Met's medium parameter looks like it should take
  // a pipe-separated list, but it doesn't OR them - "Paintings" finds 280 works
  // for "horse", "Paintings|Drawings" finds 16 and adding Prints finds 2 - so
  // each medium gets its own search and the results are merged.
  getMediums() {
    if (!this.medium) {
      return [];
    }
    return Array.isArray(this.medium) ? this.medium : [this.medium];
  }

  // Round robin, so that asking for paintings and drawings doesn't bury every
  // drawing underneath a few hundred paintings.
  interleave(lists) {
    const merged = [];
    const seen = new Set();
    const longest = Math.max(0, ...lists.map((list) => list.length));
    for (let i = 0; i < longest; i += 1) {
      for (const list of lists) {
        const objectId = list[i];
        if (objectId !== undefined && !seen.has(objectId)) {
          seen.add(objectId);
          merged.push(objectId);
        }
      }
    }
    return merged;
  }

  // `medium` has the same disease as hasImages: it does filter correctly, but
  // it also staples a fixed set of objects onto every result, the same ones
  // whatever you search for. Learning that set once and subtracting it leaves
  // the results that actually match. For "egg" it is the difference between
  // 392 results and the 54 that have anything to do with eggs.
  async getNoise(medium) {
    this.noise = this.noise || {};
    if (!this.noise[medium]) {
      this.noise[medium] = new Set(await this.searchIds(NOISE_QUERY, medium));
    }
    return this.noise[medium];
  }

  async search(query) {
    const mediums = this.getMediums();

    if (mediums.length === 0) {
      return this.searchIds(query);
    }

    const lists = [];

    for (const medium of mediums) {
      const objectIds = await this.searchIds(query, medium);
      const noise = await this.getNoise(medium);
      lists.push(objectIds.filter((objectId) => !noise.has(objectId)));
    }

    return this.interleave(lists);
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

  log(message) {
    console.log(`🖼  ${message}`);
  }

  // Try the caption first, fall back to the configured query. A caption term
  // is rejected if it finds nothing, or if it finds so much that it clearly
  // matched as a word rather than as a subject.
  async getSearch(result, numImage) {
    if (!this.useCaption) {
      this.log('Not looking at the caption (useCaption is off).');
    } else {
      const caption = this.getCaption(result, numImage);
      if (!caption) {
        this.log('This image has no caption to work from.');
      } else {
        this.log(`Caption: "${caption}"`);
        const captionQuery = this.getCaptionQuery(caption);
        if (!captionQuery) {
          this.log('Nothing in there to search for, it is all vague or empty.');
        } else {
          const { term, kind } = captionQuery;
          const objectIds = await this.search(term);
          const count = objectIds.length;
          const found = `Searched the caption for "${term}" (${kind})`;
          if (count === 0) {
            this.log(`${found}: nothing.`);
          } else if (count > this.captionMaxResults) {
            this.log(
              `${found}: ${count} results, too broad to mean anything (over ${this.captionMaxResults}).`
            );
          } else {
            this.log(`${found}: ${count} results. Using those.`);
            return { query: term, objectIds, isFromCaption: true };
          }
        }
      }
    }

    const query = this.getQuery();
    const options = Array.isArray(this.query) ? ` of ${this.query.length}` : '';
    this.log(`Falling back to the configured query${options}: "${query}"`);
    const objectIds = await this.search(query);
    this.log(`Searched for "${query}": ${objectIds.length} results.`);
    return { query, objectIds, isFromCaption: false };
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
    // png, since these buffers get written out as .png by the collapse step.
    return sharp(buffer)
      .resize(width, height, { fit: this.fit })
      .png()
      .toBuffer();
  }

  // Runs as a frame filter rather than an image filter so that the caption,
  // which the harness draws at the end of each frame's turn, lands on top of
  // the artwork instead of underneath the replacement.
  async applyFrame(frame, { image, numImage, numImages, numFrames, result }) {
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
      this.log('Only one image in this set, leaving it alone.');
      return;
    }

    if (numFrames > 1) {
      this.log('This image is animated, art attack only does stills.');
      return;
    }

    this.log(`Taking on image ${numImage + 1} of ${numImages}.`);

    const { width, height } = image.getInfo();

    try {
      const { query, objectIds, isFromCaption } = await this.getSearch(
        result,
        numImage
      );

      if (objectIds.length === 0) {
        this.log(`The Met has nothing for "${query}", leaving this one alone.`);
        return;
      }

      const object = await this.findArtwork(objectIds, width > height);

      if (!object) {
        this.log(
          `Checked ${Math.min(this.maxChecks, objectIds.length)} of them and none were public domain, landscape and downloadable. Leaving this one alone.`
        );
        return;
      }

      frame.buffer = await this.getBuffer(object.primaryImage, width, height);

      this.artwork = {
        query,
        isFromCaption,
        title: object.title,
        artist: object.artistDisplayName || null,
        date: object.objectDate,
        medium: object.medium,
        url: object.objectURL
      };

      image.setData('artwork', this.artwork);

      const { title, artist, date } = this.artwork;
      this.log(
        `Replaced image ${numImage + 1} of ${numImages} with "${title}"${
          artist ? ` by ${artist}` : ''
        }${date ? `, ${date}` : ''}`
      );
      this.log(`Found via ${isFromCaption ? 'the caption' : 'the query'}: ${
        this.artwork.url
      }`);
    } catch (err) {
      this.log(`Could not get art: ${err.message}`);
    }
  }
}

module.exports = FilterArtAttack;
