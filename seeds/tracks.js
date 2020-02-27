const { withDbConnection, dropIfExists, getSpotityToken } = require("../lib/library");
const Track = require("../models/Track");
const axios = require("axios");

const playlistsArray = ['37i9dQZF1DXdPec7aLTmlC', '37i9dQZF1DXbrUpGvoi3TS', '37i9dQZF1DX843Qf4lrFtZ'];

getSpotityToken().then(result => {
  const accessToken = result.data.access_token;

  Promise.all(playlistsArray.map(playlist => {
    return axios({
      method: 'get',
      url: `https://api.spotify.com/v1/playlists/${playlist}/tracks?limit=1`,
      headers: {
        'Authorization': 'Bearer ' + accessToken,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      responseType: 'json'
    })
  })).then(tracksCollection => {
    withDbConnection(async () => {
      await dropIfExists(Track);
      await tracksCollection.forEach(async (tracks) => {
        await Track.create(...tracks.data.items.map(async (i) => {
          return {
            "name": i.track.name,
            "artists": i.track.artists.map(artist => {
              return {
                "spotifyId": artist.id,
                "name": artist.name,
                "spotifyUrl": artist.external_urls.spotify,
              }
            }),
            "popularity": i.track.popularity,
            "spotifyUrl": i.track.external_urls.spotify,
            "spotifyId": i.track.id
          }
        }));
      })
    });
  }).catch(error => {
    console.log('ERROR: ' + error);
  })
});