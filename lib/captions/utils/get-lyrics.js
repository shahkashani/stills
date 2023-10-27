const Musixmatch = require('musixmatch-node');
const { sample, get } = require('lodash');

const ATTEMPTS = 5;

const getLyricsForTracks = async (msx, tracks) => {
  const { track } = sample(tracks);
  console.log(`🎤 Choosing ${track.track_name}`);
  const result = await msx.getTrackLyrics(track.track_id);
  return get(result, 'message.body.lyrics.lyrics_body');
};

module.exports = getLyrics = async (artist, { apikey }) => {
  let attempts = 0;
  const msx = new Musixmatch(apikey);
  console.log(`🎤 Searching for lyrics by ${artist}`);
  const {
    message: {
      body: {
        artist_list: [
          {
            artist: { artist_id, artist_name }
          }
        ]
      }
    }
  } = await msx.searchArtist({
    q: artist,
    page_size: 1
  });
  console.log(`🎤 Found ${artist_name} (${artist_id})`);
  const {
    message: {
      body: { album_list }
    }
  } = await msx.getArtistAlbums({
    artist_id,
    page_size: 100
  });
  console.log(`🎤 Found ${album_list.length} albums for ${artist}`);
  const { album } = sample(album_list);
  console.log(`🎤 Choosing ${album.album_name} (${album.album_release_date})`);
  const {
    message: {
      body: { track_list }
    }
  } = await msx.getAlbumTracks({ album_id: album.album_id });

  console.log(`🎤 Found the following tracks:`);

  track_list.forEach(({ track }) => {
    console.log(`  🎵 ${track.track_name}`);
  });

  let lyrics = '';

  while (!lyrics && attempts < ATTEMPTS) {
    lyrics = await getLyricsForTracks(msx, track_list);
    attempts += 1;
  }

  if (!lyrics) {
    throw new Error('Could not get lyrics from this album.');
  }

  lyrics = lyrics.split(/\n/).slice(0, -4).join('\n');
  console.log(`🎤 Lyrics: ${lyrics}`);
  return lyrics;
};
