const { withDbConnection, dropIfExists, getSpotityToken } = require("../lib");
const Track = require("../models/Track");
const axios = require("axios");

getSpotityToken().then(result => {
  const accessToken = result.data.access_token;

  axios({
    method: 'get',
    url: `https://api.spotify.com/v1/playlists/37i9dQZF1DXdPec7aLTmlC/tracks?limit=90`,
    headers: {
      'Authorization': 'Bearer ' + accessToken,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    responseType: 'json'
  }).then(response => {
    const tracks = response.data.items;
    withDbConnection(async () => {
      await dropIfExists(Track);
      await Track.create(tracks.map(item => {
        return {
          "name": item.track.name,
          "artists": item.track.artists.map(artist => {
            return {
              "spotifyId": artist.id,
              "name": artist.name,
              "spotifyUrl": artist.external_urls.spotify,
            }
          }),
          "popularity": item.track.popularity,
          "spotifyUrl": item.track.external_urls.spotify,
          "spotifyId": item.track.id
        }
      }));
    });
  }).catch(error => {
    console.log('ERROR: ' + error);
  })
});