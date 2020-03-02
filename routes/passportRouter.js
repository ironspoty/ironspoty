require('dotenv').config();

const { isLoggedIn, isLoggedOut, getSpotityToken } = require('../lib');
const querystring = require('querystring');
const axios = require('axios');
const express = require("express");
const passportRouter = express.Router();
const ensureLogin = require("connect-ensure-login");

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


// -------------------------
// Helper functions
// -------------------------
const updateUserCurrentTracks = (req, res) => {
    axios({
        method: 'get',
        url: `https://api.spotify.com/v1/me/player/recently-played?limit=10`,
        headers: { 'Authorization': `Bearer ${spotyAccessToken}` },
        transformResponse: [(data) => {
            let transformedData = JSON.parse(data);

            return transformedData.items.map(item => {
                return {
                    "name": item.track.name,
                    "popularity": item.track.popularity,
                    "artists": item.track.artists.map(artist => artist.name).join(', '),
                    "played_at": item.played_at,
                    "duration_ms": item.track.duration_ms,
                    "spotifyUrl": item.track.external_urls.spotify,
                    "spotifyId": item.track.id
                }
            })
        }],
    }).then(async (response) => {
        await User.findByIdAndUpdate(req.user._id, {
            recentlyPlayed: response.data
        });

        return axios({
            method: 'get',
            url: `https://api.spotify.com/v1/me/player/currently-playing`,
            headers: { 'Authorization': `Bearer ${spotyAccessToken}` },
            transformResponse: [(data) => {
                let transformedData = JSON.parse(data);

                return {
                    "name": transformedData.item.name,
                    "popularity": transformedData.item.popularity,
                    "artists": transformedData.item.artists.map(artist => artist.name).join(', '),
                    "played_at": transformedData.item.played_at,
                    "duration_ms": transformedData.item.duration_ms,
                    "spotifyUrl": transformedData.item.external_urls.spotify,
                    "spotifyId": transformedData.item.id
                }
            }]
        }).then(async (response) => {
            await User.findByIdAndUpdate(req.user._id, {
                currentlyPlaying: response.data
            });
        })
    })
}


let spotyAccessToken = '';



//Get
passportRouter.get("/signup", isLoggedOut(), (req, res, next) => {
    res.render("passport/signup");
});

passportRouter.get("/friends", async (req, res, next) => {
    const user = await User
        .find({ '_id': req.user._id })
        .populate('friends');

    let friends = user[0].friends.map(friend => {
        friend.currentlyPlaying.artists = typeof friend.currentlyPlaying.artists === 'object' ?
            friend.currentlyPlaying.artists.map(artist => artist.name).join(', ') :
            friend.currentlyPlaying.artists
        friend.recentlyPlayed = friend.recentlyPlayed.slice(0, 3);
        return friend;
    })

    res.render('passport/friends', { friends })
});

passportRouter.get("/map", async (req, res, next) => {
    const users = await User.find({});
    const usersData = users.map(user => {
        return {
            "fullname": user.fullname,
            "initials": user.initials,
            "gender": user.gender,
            "age": user.dob.age,
            "avatar": user.avatar,
            "favoriteGenres": user.favoriteGenres,
            "coordinates": [user.coordinates.longitude, user.coordinates.latitude]
        }
    })

    res.render("passport/map", { usersDataJSON: JSON.stringify(usersData), usersData: usersData });
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
    res.redirect("/login");
});

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

passportRouter.get("/callback", ensureLogin.ensureLoggedIn(), async (req, res) => {

    const spotifyToken = await axios({
        method: 'post',
        url: 'https://accounts.spotify.com/api/token',
        headers: {
            'Authorization': 'Basic ' + new Buffer(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        data: querystring.stringify({ grant_type: GRANT_TYPE, code: req.query.code, redirect_uri: REDIRECT_URI }),
        responseType: 'json'
    });

    spotyAccessToken = spotifyToken.data.access_token;

    const spotifyUserData = await axios({
        method: 'get',
        url: `https://api.spotify.com/v1/me`,
        headers: { 'Authorization': `Bearer ${spotyAccessToken}` }
    });

    await User.findByIdAndUpdate(req.user._id, {
        userSpotifyData: spotifyUserData.data,
        avatar: spotifyUserData.data.images[0].url
    });

    res.redirect('/profile');
});


passportRouter.get("/profile", ensureLogin.ensureLoggedIn(), async (req, res, next) => {

    if (!spotyAccessToken) {
        res.redirect('/logout');
    }

    const recentlyPlayed = await axios({
        url: `https://api.spotify.com/v1/me/player/recently-played?limit=10`,
        headers: { 'Authorization': `Bearer ${spotyAccessToken}` },
        transformResponse: [(data) => {
            let transformedData = JSON.parse(data);

            return transformedData.items.map(item => {
                return {
                    "name": item.track.name,
                    "popularity": item.track.popularity,
                    "artists": item.track.artists.map(artist => artist.name).join(', '),
                    "played_at": item.played_at,
                    "duration_ms": item.track.duration_ms,
                    "spotifyUrl": item.track.external_urls.spotify,
                    "spotifyId": item.track.id
                }
            })
        }],
    })

    const currentlyPlaying = await axios({
        method: 'get',
        url: `https://api.spotify.com/v1/me/player/currently-playing`,
        headers: { 'Authorization': `Bearer ${spotyAccessToken}` },
        transformResponse: [(data) => {
            if (data) {

                let transformedData = JSON.parse(data);

                return {
                    "name": transformedData.item.name,
                    "popularity": transformedData.item.popularity,
                    "artists": transformedData.item.artists.map(artist => artist.name).join(', '),
                    "played_at": transformedData.item.played_at,
                    "duration_ms": transformedData.item.duration_ms,
                    "spotifyUrl": transformedData.item.external_urls.spotify,
                    "spotifyId": transformedData.item.id
                }
            }
        }]
    })

    const updatedUser = await User.findByIdAndUpdate(req.user._id, {
        recentlyPlayed: recentlyPlayed.data,
        currentlyPlaying: currentlyPlaying.data
    });

    res.render("passport/profile", { user: updatedUser });

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

passportRouter.get('/profile/:id', ensureLogin.ensureLoggedIn(), async (req, res, next) => {
    const { id } = req.params;
    const user = await User.findById(id);

    user.currentlyPlaying.artists = user.currentlyPlaying.artists.map(artist => artist.name).join(', ');

    res.render("passport/profile", { user });
})

module.exports = passportRouter;