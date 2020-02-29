require('dotenv').config();

const { app } = require('../app');
const querystring = require('querystring');
const axios = require('axios');
const express = require("express");
const passportRouter = express.Router();
const User = require("../models/user");
const bcrypt = require("bcrypt");
const bcryptSalt = 10;
const passport = require("passport");

//Ensure Login

// -------------------------
// Constants
// -------------------------
const GRANT_TYPE = process.env.GRANT_TYPE;
const REDIRECT_URI = process.env.REDIRECT_URI;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const SCOPES = process.env.SCOPES;
let spotyAccessToken = '';
const profileImage = "https://i.scdn.co/image/ab6775700000ee85945fe85f37c994a23515ad35";

//Get
passportRouter.get("/signup", (req, res, next) => {
  res.render("passport/signup");
});

//Post
passportRouter.post("/signup", (req, res, next) => {
  const username = req.body.username;
  const password = req.body.password;

  if (username === "" || password === "") {
    req.flash("error", "All fields are required");
    return res.redirect("/signup");

  }

  User.findOne({ username })
    .then(user => {
      if (user !== null) {
        req.flash("error", "User already exists")
        return res.redirect("/signup");
      }

      const salt = bcrypt.genSaltSync(bcryptSalt);
      const hashPass = bcrypt.hashSync(password, salt);

      const newUser = new User({
        username,
        password: hashPass
      });

      newUser.save((err) => {
        if (err) {

          res.redirect("/signup");

        } else {
          res.redirect("/login");
        }
      });
    })
    .catch(error => {
      next(error)
    })
});

//LOG IN
passportRouter.get("/login", (req, res, next) => {
  res.render("passport/login");
});

passportRouter.post("/login", passport.authenticate("local", {
  successRedirect: "/spotify",
  failureRedirect: "/login",
  failureFlash: true,
  passReqToCallback: true
}));

//LOG OUT
passportRouter.get("/logout", (req, res, next) => {
  req.logout();
  res.redirect("/");
});

const ensureLogin = require("connect-ensure-login");

//SPOTIFY
passportRouter.get("/spotify", ensureLogin.ensureLoggedIn(), (req, res) => {

  const scopes = SCOPES;
  const my_client_id = CLIENT_ID;
  const redirect_uri = REDIRECT_URI;

  res.redirect('https://accounts.spotify.com/authorize' +
    '?response_type=code' +
    '&client_id=' + my_client_id +
    (scopes ? '&scope=' + encodeURIComponent(scopes) : '') +
    '&redirect_uri=' + encodeURIComponent(redirect_uri));
});

passportRouter.get("/callback", ensureLogin.ensureLoggedIn(), (req, res) => {
  // app.locals.spotifyCode = req.query.code;

  axios({
    method: 'post',
    url: 'https://accounts.spotify.com/api/token',
    headers: {
      'Authorization': 'Basic ' + new Buffer(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    data: querystring.stringify({
      grant_type: GRANT_TYPE,
      code: req.query.code,
      redirect_uri: REDIRECT_URI
    }),
    responseType: 'json'
  }).then(response => {
    spotyAccessToken = response.data.access_token;
    res.redirect('/search');
  }).catch(e => {
    console.log(`
            =======================================
            ===============  ERROR  ===============
            ${e}
            =======================================`);
    return e;
  })
});

passportRouter.get('/user', ensureLogin.ensureLoggedIn(), (req, res, next) => {
  axios({
    method: 'get',
    // url: `https://api.spotify.com/v1/me`,
    // url: `https://api.spotify.com/v1/users/${12165690444}`,
    // url: 'https://api.spotify.com/v1/me/top/tracks',
    // url: 'https://api.spotify.com/v1/me/player/currently-playing',
    url: 'https://api.spotify.com/v1/me/player/recently-played',
    //url: 'https://api.spotify.com/v1/tracks/3VGHgcoqPm2vdllXXufQjh',
    //url: `https://api.spotify.com/v1/audio-features/3VGHgcoqPm2vdllXXufQjh`,
    headers: {
      'Authorization': `Bearer ${spotyAccessToken}`
    },
    responseType: 'json'
  }).then(response => {
    //res.render('user', { response: response.data})
    //res.json(response.data.images[0].url); // 1. Gets url of the users profile image using `https://api.spotify.com/v1/me`
    //res.render("passport/user", { profileImage });


    //DEVUELVE ULTIMAS 20 CANCIONES CON SU FOTO, ID 
    // printChart(response.data);
    res.render('passport/user', { response: response.data });


    //res.json(response.data);
  }).catch(e => {
    console.log(`
            =======================================
            ===============  ERROR  ===============
            ${e}
            =======================================`);
    return e;
  })
})

passportRouter.get('/userData', ensureLogin.ensureLoggedIn(), (req, res, next) => {
  axios({
    method: 'get',
    // url: `https://api.spotify.com/v1/me`,
    // url: `https://api.spotify.com/v1/users/${12165690444}`,
    // url: 'https://api.spotify.com/v1/me/top/tracks',
    // url: 'https://api.spotify.com/v1/me/player/currently-playing',
    url: 'https://api.spotify.com/v1/me/player/recently-played',
    //url: 'https://api.spotify.com/v1/tracks/3VGHgcoqPm2vdllXXufQjh',
    //url: `https://api.spotify.com/v1/audio-features/3VGHgcoqPm2vdllXXufQjh`,
    headers: {
      'Authorization': `Bearer ${spotyAccessToken}`
    },
    responseType: 'json'
  }).then(response => {
    //res.render('user', { response: response.data })
    //res.json(response.data.images[0].url); // 1. Gets url of the users profile image using `https://api.spotify.com/v1/me`
    //res.render("passport/user", { profileImage });

    //Chart de Barras
    //res.json({ data: response.data })
    //console.log("Devuelve todo el objeto json, response.data)
    getTrackNames(response.data)
    //Llama función get Id:
    const ids = getIds(response.data);

    Promise.all(ids.map(id => axios({
      method: 'get',
      url: `https://api.spotify.com/v1/audio-features/${id}`,
      headers: {
        'Authorization': `Bearer ${spotyAccessToken}`
      },
      responseType: 'json'
    })))
      .then(values => { //Retorna array de objetos
        let dance = [[], [], []]

        values.forEach((e) => dance[0].push(e.data.danceability))
        values.forEach((e) => dance[1].push(e.data.energy))
        values.forEach((e) => dance[2].push(e.data.tempo))
        console.log("This is the dance array", dance)

        res.json({ data: dance })
      })

    //res.json(response.data);
  }).catch(e => {
    console.log(`
            =======================================
            ===============  ERROR  ===============
            ${e}
            =======================================`);
    return e;
  })
})

function getIds(info) {

  let tracksID = []

  let trackID = info.items;
  // trackID.forEach((e) => console.log("This is the id of song", e.track.id))
  trackID.forEach((e) => tracksID.push(e.track.id))

  console.log(" Este es el array con todos los IDS", tracksID)

  return tracksID;
}

function getTrackNames(pajaros) {

  console.log("Array de objetos", pajaros.items)

}


passportRouter.get('/search', ensureLogin.ensureLoggedIn(), (req, res, next) => {
  if (spotyAccessToken) {
    res.render('passport/search');
  } else {
    res.redirect('/');
  }
})

passportRouter.post('/search', (req, res, next) => {
  axios({
    method: 'get',
    url: `https://api.spotify.com/v1/search?query=${req.body.q}&type=${req.body.type}&offset=0&limit=20`,
    headers: {
      'Authorization': `Bearer ${spotyAccessToken}`
    },
    responseType: 'json'
  }).then(response => {
    console.log("CARLOS", response.data)
    res.render('passport/search', { response: response.data });
  }).catch(e => {
    console.log(`
            =======================================
            ===============  ERROR  ===============
            ${e}
            =======================================`);
    return e;
  })
})

module.exports = passportRouter;