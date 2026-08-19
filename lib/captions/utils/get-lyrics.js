const fetch = require('node-fetch');
const { sample } = require('lodash');

const ATTEMPTS = 5;
const MUSICBRAINZ = 'https://musicbrainz.org/ws/2';
const LRCLIB = 'https://lrclib.net/api';
const USER_AGENT = 'stills (https://github.com/shahkashani/stills)';

// MusicBrainz asks for no more than one request a second, and answers a burst
// with a body that has no results in it rather than an error.
const RATE_LIMIT = 1100;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// MusicBrainz answers 503 when it wants you to slow down, which is worth
// waiting out rather than failing the whole post over.
const getJson = async (url, attempts = 3) => {
  let delay = RATE_LIMIT;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (response.ok) {
      return response.json();
    }
    if (response.status !== 503) {
      throw new Error(`${url} responded with ${response.status}`);
    }
    console.log(`🎤 Being told to slow down, waiting ${delay}ms`);
    await wait(delay);
    delay *= 2;
  }
  throw new Error(`${url} kept asking us to slow down.`);
};

const getTitles = async (artist) => {
  const query = encodeURIComponent(`artist:"${artist}"`);
  const { recordings } = await getJson(
    `${MUSICBRAINZ}/recording?query=${query}&fmt=json&limit=100`
  );
  // The same song turns up once per release, so collapse them.
  return [...new Set((recordings || []).map(({ title }) => title))];
};

// LRCLIB answers 404 for a track it doesn't have, which is a miss rather than
// a failure - it's community contributed, so coverage is patchy.
const getLyricsForTrack = async (artist, track) => {
  const params = new URLSearchParams({
    artist_name: artist,
    track_name: track
  });
  const response = await fetch(`${LRCLIB}/get?${params}`, {
    headers: { 'User-Agent': USER_AGENT }
  });
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`LRCLIB responded with ${response.status}`);
  }
  const { plainLyrics } = await response.json();
  return plainLyrics || null;
};

// Was Musixmatch, whose free tier needed an API key, truncated the lyrics and
// tacked a licence notice onto the end of them. MusicBrainz and LRCLIB between
// them need no key at all, so there is nothing to expire, and they hand back
// the whole song. The unused apikey is kept so callers don't have to change.
const getLyrics = async (artist, { apikey } = {}) => {
  console.log(`🎤 Searching for lyrics by ${artist}`);

  const titles = await getTitles(artist);

  if (titles.length === 0) {
    throw new Error(`MusicBrainz has no tracks for ${artist}.`);
  }

  console.log(`🎤 Found ${titles.length} tracks by ${artist}`);

  const tried = [];

  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const remaining = titles.filter((title) => tried.indexOf(title) === -1);

    if (remaining.length === 0) {
      break;
    }

    const track = sample(remaining);
    tried.push(track);

    console.log(`🎤 Choosing ${track}`);
    const lyrics = await getLyricsForTrack(artist, track);

    if (lyrics) {
      console.log(`🎤 Lyrics: ${lyrics}`);
      return lyrics;
    }

    console.log(`🎤 No lyrics for ${track}, trying another`);
    await wait(RATE_LIMIT);
  }

  throw new Error(
    `Could not find lyrics for ${artist} after ${tried.length} tries.`
  );
};

module.exports = getLyrics;
