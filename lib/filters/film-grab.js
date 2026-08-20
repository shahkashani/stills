const fetch = require('node-fetch');
const { sample } = require('lodash');
const sharp = require('../utils/sharp');
const getVideoFrames = require('../content/utils/get-frames');

const API = 'https://film-grab.com/wp-json/wp/v2';
const AJAX = 'https://film-grab.com/wp-admin/admin-ajax.php';
const ARCHIVE = 'https://archive.org';

// Replaces one image of a set with a frame from film-grab.com, which is a
// curated archive of cinematography stills organised by category - genre,
// country, decade, aspect ratio and director are all categories, so `category`
// takes any of their slugs: "noir", "horror", "david-lynch", "1-851".
//
// A still gets a still. An animated image gets moving footage instead, pulled
// from a trailer on archive.org, because film-grab stores roughly one frame per
// shot - consecutive frames there are different scenes, so cycling through them
// makes a GIF jump about rather than move.
//
// Note this is copyrighted film material, published for commentary, not public
// domain like the Met.
class FilterFilmGrab {
  constructor({
    category = 'noir',
    index = null,
    skipFirst = true,
    minWidth = 720,
    maxChecks = 6,
    stills = 1,
    video = true,
    archiveCollection = 'movie_trailers',
    archiveSubject = null,
    minVideoWidth = 400,
    seekWindow = [0.1, 0.35],
    moderation = null,
    allowSingle = false,
    fit = 'cover',
    userAgent = 'stills (https://github.com/shahkashani/stills)'
  } = {}) {
    this.category = category;
    this.index = index;
    this.skipFirst = skipFirst;
    this.minWidth = minWidth;
    this.maxChecks = maxChecks;
    this.stills = stills;
    this.video = video;
    this.archiveCollection = archiveCollection;
    this.archiveSubject = archiveSubject;
    this.minVideoWidth = minVideoWidth;
    this.seekWindow = seekWindow;
    this.moderation = moderation;
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

  // Screens a candidate against whatever moderation the caller passed in - the
  // same stills.moderation.Words the captions go through. This only sees what
  // the source chose to write down, so it catches a film labelled for its
  // content, not a swastika in an unlabelled frame.
  async isAllowed(...parts) {
    if (!this.moderation) {
      return true;
    }
    const text = parts
      .filter(Boolean)
      .join(' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&[a-z]+;/gi, ' ');
    const allowed = await this.moderation.validate(text);
    if (!allowed) {
      this.log(`Skipping "${String(parts[0]).slice(0, 48)}", moderation said no.`);
    }
    return allowed;
  }

  // The archive.org steps are slow enough - a remote ffprobe, then ffmpeg
  // seeking into a file it never downloads - that silence looks like a hang.
  async measure(prefix, what, fn) {
    const started = Date.now();
    this.log(`${prefix} ${what}...`);
    const result = await fn();
    this.log(`${prefix} ${what} took ${((Date.now() - started) / 1000).toFixed(1)}s`);
    return result;
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

  // archive.org's movie_trailers collection, narrowed by subject. The subject
  // defaults to the film-grab category so that "noir" means noir in both.
  async searchArchive(subject) {
    const query = `collection:${this.archiveCollection} AND subject:${subject}`;
    const url =
      `${ARCHIVE}/advancedsearch.php?q=${encodeURIComponent(query)}` +
      '&fl%5B%5D=identifier&fl%5B%5D=title&rows=100&output=json';
    const body = await this.get(url);
    return (body.response && body.response.docs) || [];
  }

  async getVideo(identifier) {
    const meta = await this.get(`${ARCHIVE}/metadata/${identifier}`);
    const md = meta.metadata || {};

    const allowed = await this.isAllowed(
      md.title,
      Array.isArray(md.subject) ? md.subject.join(' ') : md.subject,
      md.description,
      md.creator,
      md.director
    );

    if (!allowed) {
      return null;
    }

    // The metadata carries length and dimensions per file, so there is no need
    // to ffprobe the video - that cost a minute against a remote file. Pick the
    // smallest rendition that is still wide enough to use, since archive.org
    // derivatives go down to 320x240 and streaming the 21MB original is slow.
    const candidates = (meta.files || [])
      .filter((f) => /\.mp4$/i.test(f.name) && f.length && f.width)
      .map((f) => ({
        name: f.name,
        length: Number(f.length),
        width: Number(f.width),
        height: Number(f.height),
        size: Number(f.size || 0)
      }))
      .filter((f) => f.width >= this.minVideoWidth)
      .sort((a, b) => a.size - b.size);

    const file = candidates[0];

    if (!file) {
      return null;
    }

    return {
      url: `${ARCHIVE}/download/${identifier}/${encodeURIComponent(file.name)}`,
      length: file.length,
      width: file.width,
      height: file.height,
      size: file.size
    };
  }

  // Consecutive frames straight out of the video, which is the only way to get
  // something that actually moves.
  async getMovingFrames(width, height, numFrames, fps, subject) {
    const docs = await this.searchArchive(subject);

    if (docs.length === 0) {
      this.log(`archive.org has no ${this.archiveCollection} tagged "${subject}".`);
      return null;
    }

    this.log(`Looking through ${docs.length} trailers tagged "${subject}"`);

    const tried = [];

    for (let attempt = 0; attempt < this.maxChecks; attempt += 1) {
      const remaining = docs.filter((doc) => tried.indexOf(doc) === -1);
      if (remaining.length === 0) {
        break;
      }

      const doc = sample(remaining);
      tried.push(doc);
      const count = `${tried.length}/${this.maxChecks}`;
      const name = String(doc.title).slice(0, 44);

      try {
        this.log(`${count} ${name}`);

        const video = await this.getVideo(doc.identifier);
        if (!video) {
          this.log(`${count} nothing at least ${this.minVideoWidth}px wide, trying another`);
          continue;
        }

        const { url, length } = video;
        const clip = numFrames / fps;

        if (length < clip * 2) {
          this.log(`${count} only ${Math.round(length)}s long, trying another`);
          continue;
        }

        this.log(
          `${count} ${video.width}x${video.height}, ${Math.round(length)}s, ${Math.round(video.size / 1048576)}MB`
        );

        // Seek early. ffmpeg streams the file up to the seek point, and
        // archive.org's storage nodes are slow, so asking for 117s into a 140s
        // trailer means dragging almost the whole file through. The first tenth
        // is usually titles, so start just after it.
        const [from, to] = this.seekWindow;
        const start = length * from;
        const end = Math.max(start + 1, Math.min(length * to, length - clip));
        const seconds = start + Math.random() * (end - start);
        const buffers = await this.measure(
          count,
          `pulling ${numFrames} frames from ${Math.round(seconds)}s of ${Math.round(length)}s`,
          () => getVideoFrames(url, seconds, numFrames, fps, width)
        );

        if (buffers.length === 0) {
          this.log(`${count} no frames came back, trying another`);
          continue;
        }

        const resized = [];
        for (const buffer of buffers) {
          resized.push(
            await sharp(buffer)
              .resize(width, height, { fit: this.fit })
              .png()
              .toBuffer()
          );
        }

        return {
          buffers: resized,
          meta: {
            source: 'archive.org',
            subject,
            title: String(doc.title),
            url: `${ARCHIVE}/details/${doc.identifier}`,
            seconds: Math.round(seconds),
            images: resized.length
          }
        };
      } catch (err) {
        // A dead item, an unreadable file, or archive.org having a moment.
        this.log(`${count} ${err.message.split('\n')[0].slice(0, 70)}`);
        continue;
      }
    }

    this.log(`Could not get usable footage from ${tried.length} trailers.`);
    return null;
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
      // png, because makeGif writes these straight out as a .png sequence and
      // sharp would otherwise hand back whatever the source format was.
      buffer: await sharp(buffer)
        .resize(width, height, { fit: this.fit })
        .png()
        .toBuffer()
    };
  }

  // One still by default, held for the whole image. film-grab stores about one
  // frame per shot, so consecutive frames are different scenes entirely and
  // cycling through them makes a GIF jump around rather than move. Raise
  // `stills` if that cutting is what you want.
  async getReplacement(width, height, numFrames, slug) {
    const { films, count, name } = await this.getFilms(slug);

    if (films.length === 0) {
      this.log(`No films in "${slug}", leaving this one alone.`);
      return null;
    }

    this.log(`Looking through ${count} films in ${name}`);

    const needed = Math.max(1, Math.min(this.stills, numFrames));
    const tried = [];

    for (let attempt = 0; attempt < this.maxChecks; attempt += 1) {
      const remaining = films.filter((film) => tried.indexOf(film) === -1);
      if (remaining.length === 0) {
        break;
      }

      const film = sample(remaining);
      tried.push(film);
      const count = `${tried.length}/${this.maxChecks}`;

      // The post body links every category the film is filed under - genre,
      // country, director - which is the only descriptive text on offer.
      const categories = [
        ...new Set(
          (film.content.rendered.match(/\/category\/([^/"']+)\//g) || []).map((c) =>
            c.replace(/\/category\/|\//g, '').replace(/-/g, ' ')
          )
        )
      ].join(' ');

      if (!(await this.isAllowed(film.title.rendered, categories))) {
        continue;
      }

      this.log(
        `${count} ${film.title.rendered.replace(/&#[0-9]+;/g, "'").slice(0, 44)}`
      );

      const frames = await this.getFrames(film);
      if (frames.length === 0) {
        this.log(`${count} no frames listed, trying another`);
        continue;
      }

      // A consecutive run, so the frames stay roughly in story order.
      const start = Math.floor(Math.random() * Math.max(1, frames.length - needed));
      const buffers = [];
      let info = null;

      for (const url of frames.slice(start, start + needed)) {
        const result = await this.getBuffer(url, width, height);
        if (result) {
          buffers.push(result.buffer);
          info = info || result.info;
        }
      }

      if (buffers.length === 0) {
        this.log(`${count} everything was under ${this.minWidth}px, trying another`);
        continue;
      }

      const title = film.title.rendered
        .replace(/&#[0-9]+;/g, "'")
        .replace(/&amp;/g, '&');

      return {
        buffers,
        meta: {
          category: slug,
          title,
          url: film.link,
          width: info.width,
          height: info.height,
          images: buffers.length,
          total: frames.length
        }
      };
    }

    this.log(
      `Checked ${tried.length} films and found nothing at least ${this.minWidth}px wide.`
    );
    return null;
  }

  async applyFrame(frame, { image, numImage, numFrame, numImages, numFrames }) {
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

    // Fetch once for the whole image, then hand out the frames in order.
    if (numFrame === 0 || !this.buffers) {
      this.buffers = null;
      const { width, height, fps } = image.getInfo();
      const slug = this.getCategory();

      try {
        // Anything animated wants footage; a still wants a still.
        const replacement =
          numFrames > 1 && this.video
            ? await this.getMovingFrames(
                width,
                height,
                numFrames,
                fps || 12,
                this.archiveSubject || slug
              )
            : null;

        const useFilmGrab =
          replacement || (await this.getReplacement(width, height, numFrames, slug));

        if (!useFilmGrab) {
          return;
        }

        this.buffers = useFilmGrab.buffers;
        this.frame = useFilmGrab.meta;
        image.setData('filmgrab', this.frame);

        if (this.frame.source === 'archive.org') {
          this.log(
            `Replaced image ${numImage + 1} of ${numImages} with ${this.frame.images} frames of ${this.frame.title} from ${this.frame.seconds}s in`
          );
        } else {
          const { title, width: w, height: h, images, total } = this.frame;
          this.log(
            `Replaced image ${numImage + 1} of ${numImages} with ${title} (${w}x${h}, ${images} of ${total} frames)`
          );
        }
      } catch (err) {
        this.log(`Could not get a frame: ${err.message}`);
        return;
      }
    }

    if (!this.buffers) {
      return;
    }

    const perStill = Math.max(1, Math.ceil(numFrames / this.buffers.length));
    frame.buffer = this.buffers[Math.floor(numFrame / perStill) % this.buffers.length];
  }
}

module.exports = FilterFilmGrab;
