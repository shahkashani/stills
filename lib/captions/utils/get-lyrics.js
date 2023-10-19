const Musixmatch = require('musixmatch-node');
const { sample } = require('lodash');

module.exports = getLyrics = async (artist, { apikey }) => {
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

  const { track } = sample(track_list);
  console.log(`🎤 Choosing ${track.track_name}`);
  const {
    message: {
      body: {
        lyrics: { lyrics_body }
      }
    }
  } = await msx.getTrackLyrics(track.track_id);
  const lyrics = lyrics_body.split(/\n/).slice(0, -4).join('\n');
  console.log(`🎤 Lyrics: ${lyrics}`);
  return lyrics;
};
