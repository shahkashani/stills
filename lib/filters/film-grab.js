const fetch = require('node-fetch');
const { sample } = require('lodash');
const sharp = require('../utils/sharp');

const API = 'https://film-grab.com/wp-json/wp/v2';
const AJAX = 'https://film-grab.com/wp-admin/admin-ajax.php';

// Replaces one image of a set with a frame from film-grab.com, which is a
// curated archive of cinematography stills organised by category - genre,
// country, decade, aspect ratio and director are all categories, so `category`
// takes any of their slugs: "noir", "horror", "david-lynch", "1-851".
//
// Note this is copyrighted film material, published there for commentary, not
// public domain like the Met.
class FilterFilmGrab {
  constructor({
    category = 'noir',
    index = null,
    skipFirst = true,
    minWidth = 720,
    maxChecks = 6,
    allowSingle = false,
    fit = 'cover',
    userAgent = 'stills (https://github.com/shahkashani/stills)'
  } = {}) {
    this.category = category;
    this.index = index;
    this.skipFirst = skipFirst;
    this.minWidth = minWidth;
    this.maxChecks = maxChecks;
    this.allowSingle = allowSingle;
    this.fit = fit;
    this.userAgent = userAgent;
    this.frame = null;
  }

  get name() {
    return 'film-grab';
  }

  log(message) {
    console.log(`🎞  ${message}`);
  }

  getCategory() {
    return Array.isArray(this.category) ? sample(this.category) : this.category;
  }

  getTargetIndex(numImages) {
    if (typeof this.index === 'number') {
      return this.index % numImages;
    }
    const first = this.skipFirst && numImages > 1 ? 1 : 0;
    return first + Math.floor(Math.random() * (numImages - first));
  }

  async get(url, isJson = true) {
    const response = await fetch(url, {
      headers: { 'User-Agent': this.userAgent }
    });
    if (!response.ok) {
      throw new Error(`film-grab responded with ${response.status}`);
    }
    return isJson ? response.json() : response.text();
  }

  // A random page of films, so it isn't always the same hundred.
  async getFilms(slug) {
    const [category] = await this.get(`${API}/categories?slug=${slug}`);
    if (!category) {
      return { films: [], count: 0 };
    }
    const pages = Math.max(1, Math.ceil(category.count / 100));
    const page = 1 + Math.floor(Math.random() * pages);
    const films = await this.get(
      `${API}/posts?categories=${category.id}&per_page=100&page=${page}`
    );
    return { films, count: category.count, name: category.name };
  }

  // Newer entries have the frames in the post body. Older ones render a
  // gallery plugin instead, and the URLs only turn up in its ajax response.
  async getFrames(film) {
    const html = film.content.rendered || '';
    const direct = (
      html.match(/https:\/\/film-grab\.com\/wp-content\/uploads\/[^"'\s)]+\.jpg/gi) ||
      []
    ).filter((url) => !url.includes('/thumb/'));

    if (direct.length > 0) {
      return [...new Set(direct)];
    }

    const gallery = {};
    for (const key of ['gallery_id', 'theme_id', 'shortcode_id']) {
      const match = html.match(new RegExp(`${key}=([^&"'\\s]+)`));
      if (match) {
        gallery[key] = match[1];
      }
    }

    if (!gallery.gallery_id) {
      return [];
    }

    const body = await this.get(
      `${AJAX}?action=bwg_frontend_data&shortcode_id=${gallery.shortcode_id}&gallery_id=${gallery.gallery_id}&theme_id=${gallery.theme_id}&tag=0&page_number=1&type=gallery`,
      false
    );
    // Filenames contain spaces and brackets - "01 (165).jpg" - so match the
    // href attribute rather than trying to match the URL shape.
    const hrefs = [
      ...body.matchAll(
        /href="(https:\/\/film-grab\.com\/wp-content\/uploads\/photo-gallery\/[^"]+?\.jpe?g)(?:\?[^"]*)?"/gi
      )
    ].map((match) => match[1]);

    return [...new Set(hrefs.filter((url) => !url.includes('/thumb/')))];
  }

  // film-grab gives no dimensions up front, and older films are scanned small,
  // so the only way to hold a quality bar is to fetch and look.
  async getBuffer(url, width, height) {
    const response = await fetch(url, {
      headers: { 'User-Agent': this.userAgent }
    });
    if (!response.ok) {
      return null;
    }
    const buffer = await response.buffer();
    const info = await sharp(buffer).metadata();
    if (info.width < this.minWidth) {
      return null;
    }
    return {
      info,
      buffer: await sharp(buffer).resize(width, height, { fit: this.fit }).toBuffer()
    };
  }

  async applyFrame(frame, { image, numImage, numImages, numFrames }) {
    if (numImage === 0 || typeof this.targetIndex !== 'number') {
      this.targetIndex = this.getTargetIndex(numImages);
      this.frame = null;
    }

    if (numImage !== this.targetIndex) {
      return;
    }

    if (numImages < 2 && !this.allowSingle) {
      this.log('Only one image in this set, leaving it alone.');
      return;
    }

    if (numFrames > 1) {
      this.log('This image is animated, film grab only does stills.');
      return;
    }

    const { width, height } = image.getInfo();
    const slug = this.getCategory();

    try {
      const { films, count, name } = await this.getFilms(slug);

      if (films.length === 0) {
        this.log(`No films in "${slug}", leaving this one alone.`);
        return;
      }

      this.log(`Looking through ${count} films in ${name}`);

      const tried = [];

      for (let attempt = 0; attempt < this.maxChecks; attempt += 1) {
        const remaining = films.filter((film) => tried.indexOf(film) === -1);
        if (remaining.length === 0) {
          break;
        }

        const film = sample(remaining);
        tried.push(film);

        const frames = await this.getFrames(film);
        if (frames.length === 0) {
          continue;
        }

        const url = sample(frames);
        const result = await this.getBuffer(url, width, height);
        if (!result) {
          continue;
        }

        frame.buffer = result.buffer;

        this.frame = {
          category: slug,
          title: film.title.rendered
            .replace(/&#[0-9]+;/g, "'")
            .replace(/&amp;/g, '&'),
          url: film.link,
          image: url,
          width: result.info.width,
          height: result.info.height
        };

        image.setData('filmgrab', this.frame);

        this.log(
          `Replaced image ${numImage + 1} of ${numImages} with ${
            this.frame.title
          } (${this.frame.width}x${this.frame.height}, ${frames.length} frames)`
        );
        return;
      }

      this.log(
        `Checked ${tried.length} films and found nothing at least ${this.minWidth}px wide.`
      );
    } catch (err) {
      this.log(`Could not get a frame for "${slug}": ${err.message}`);
    }
  }
}

module.exports = FilterFilmGrab;
