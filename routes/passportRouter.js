require('dotenv').config();

const { isLoggedIn, isLoggedOut } = require('../lib');
const querystring = require('querystring');
const axios = require('axios');

const express = require("express");
const passportRouter = express.Router();

// Require user model
const User = require("../models/User");

// Add bcrypt to encrypt passwords
const bcrypt = require("bcrypt");
const bcryptSalt = 10;

// Add passport
const passport = require("passport");


// -------------------------
// Constants
// -------------------------
const GRANT_TYPE = process.env.GRANT_TYPE;
const REDIRECT_URI = process.env.REDIRECT_URI;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const SCOPES = process.env.SCOPES;
let spotyAccessToken = '';

//Get
passportRouter.get("/signup", isLoggedOut(), (req, res, next) => {
  res.render("passport/signup");
});

passportRouter.get("/friends", (req, res, next) => {
  res.render("passport/friends");
});

passportRouter.get("/map", async (req, res, next) => {
  const users = await User.find({})
  const seedsInfo = [[], [], [], [], []]
  const coordinates = [
    [-3.6806426, 40.4641763],
    [-3.6775118, 40.4181685],
    [-3.7287666, 40.4702098],
    [-3.692049, 40.4658571],
    [-3.6824795, 40.4219631],
    [-3.6974001, 40.4524187],
    [-3.6392159, 40.4631333],
    [-3.7057999, 40.4518661],
    [-3.7083202, 40.423093],
    [-3.6867364, 40.4601224],
    [-3.6949302, 40.4010216],
    [-3.6924296, 40.4251223],
    [-3.7159634, 40.4390676],
    [-3.726689, 40.427977],
    [-3.7304776, 40.4613439],
    [-3.7150402, 40.4103102],
    [-3.6851124, 40.4456899],
    [-3.6754097, 40.4569816],
    [-3.6700987, 40.44825],
    [-3.7009534, 40.4348648],
    [-3.6848242, 40.4327656],
    [-3.6713801, 40.4278899],
    [-3.6337514, 40.4423879],
    [-3.6963938, 40.4360524],
    [-3.7939977, 40.4591683],
    [-3.7062432, 40.4947343]
  ]

  users.forEach((e) => seedsInfo[0].push(e.name))
  users.forEach((e) => seedsInfo[1].push(e.gender))
  users.forEach((e) => seedsInfo[2].push(e.dob.age))
  users.forEach((e) => seedsInfo[3].push(e.avatar))

  //Delete last element of Array. User by defect
  seedsInfo.forEach((e) => e.pop())
  coordinates.forEach((e) => seedsInfo[4].push(e))



  console.log("Array POPEADOOOOOOOOOO y con COOOOOORDENADAS", seedsInfo)

  res.render("passport/map", { seedsInfo });

});

passportRouter.get("/user-profile", (req, res, next) => {
  res.render("passport/user-profile");
});



//Post
passportRouter.post("/signup", isLoggedOut(), (req, res, next) => {
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

passportRouter.get("/login", isLoggedOut(), (req, res, next) => {
  res.render("passport/login");
});

passportRouter.post("/login", passport.authenticate("local", {
  successRedirect: "/spotify",
  failureRedirect: "/login",
  failureFlash: true,
  passReqToCallback: true
}));

//LOG OUT
passportRouter.get("/logout", isLoggedIn(), (req, res, next) => {
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

    axios({
      method: 'get',
      url: `https://api.spotify.com/v1/me`,
      headers: { 'Authorization': `Bearer ${spotyAccessToken}` }
    }).then(async (response) => {

      await User.findByIdAndUpdate(req.user._id, {
        userSpotifyData: response.data
      });

      res.redirect('/user-profile');
    })

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
    url: 'https://api.spotify.com/v1/me/player/recently-played',
    headers: {
      'Authorization': `Bearer ${spotyAccessToken}`
    },
    responseType: 'json'
  }).then(response => {
    res.render('passport/user', { response: response.data })
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
    url: 'https://api.spotify.com/v1/me/player/recently-played',
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