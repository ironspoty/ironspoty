require('dotenv').config();

const { isLoggedIn, isLoggedOut, getSpotityToken } = require('../lib');
const querystring = require('querystring');
const axios = require('axios');
const express = require('express');
const ironSpotyRouter = express.Router();
const ensureLogin = require('connect-ensure-login');
const moment = require('moment');

// Require user model
const User = require('../models/User');
const Post = require('../models/Post');

// Add bcrypt to encrypt passwords
const bcrypt = require('bcrypt');
const bcryptSalt = 10;

// Add passport
const passport = require('passport');


// -------------------------
// Constants
// -------------------------
const GRANT_TYPE = process.env.GRANT_TYPE;
const REDIRECT_URI = process.env.REDIRECT_URI;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const SCOPES = process.env.SCOPES;

let spotyAccessToken = '';

// SIGN UP
ironSpotyRouter.get("/signup", isLoggedOut(), (req, res, next) => {
    res.render("app/signup");
});

ironSpotyRouter.post("/signup", isLoggedOut(), (req, res, next) => {
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


// LOG IN
ironSpotyRouter.get("/login", (req, res, next) => {
    res.render("app/login");
});

ironSpotyRouter.post("/login", passport.authenticate("local", {
    successRedirect: "/spotify",
    failureRedirect: "/login",
    failureFlash: true,
    passReqToCallback: true
}));


// LOG OUT
ironSpotyRouter.get("/logout", ensureLogin.ensureLoggedIn(), (req, res, next) => {
    req.logout();
    res.redirect("/login");
});


// SPOTIFY
ironSpotyRouter.get("/spotify", ensureLogin.ensureLoggedIn(), (req, res) => {

    if (!req.user.userSpotifyData) {
        res.redirect('/profile');
    }

    const scopes = SCOPES;
    const my_client_id = CLIENT_ID;
    const redirect_uri = REDIRECT_URI;

    res.redirect('https://accounts.spotify.com/authorize' +
        '?response_type=code' +
        '&client_id=' + my_client_id +
        '&show_dialog=true' +
        (scopes ? '&scope=' + encodeURIComponent(scopes) : '') +
        '&redirect_uri=' + encodeURIComponent(redirect_uri));
});

ironSpotyRouter.get("/callback", ensureLogin.ensureLoggedIn(), async (req, res) => {

    if (req.query.error) {
        req.logout();
        res.redirect('/auth-error');
    }

    if (req.user.userSpotifyData) {
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
    }

    res.redirect('/profile');
});

ironSpotyRouter.get("/auth-error", isLoggedOut(), (req, res, next) => {
    res.render("app/auth-error");
});


// APP INNER
ironSpotyRouter.get('/', ensureLogin.ensureLoggedIn(), (req, res, next) => {
    if (req.user)
        res.redirect('/profile');
    else
        res.redirect('/login');
});

ironSpotyRouter.get("/map", ensureLogin.ensureLoggedIn(), async (req, res, next) => {
    const users = await User.find({ _id: { $ne: req.user._id } });
    const usersData = users.map(user => {
        return {
            "id": user._id,
            "fullname": user.fullname,
            "initials": user.initials,
            "gender": user.gender,
            "age": user.dob.age,
            "avatar": user.avatar,
            "favoriteGenres": user.favoriteGenres,
            "coordinates": [user.coordinates.longitude, user.coordinates.latitude]
        }
    })

    res.render("app/map", { usersDataJSON: JSON.stringify(usersData), usersData: usersData });
});

ironSpotyRouter.get("/friends", ensureLogin.ensureLoggedIn(), async (req, res, next) => {
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

    res.render('app/friends', { friends })
});

ironSpotyRouter.get("/profile", ensureLogin.ensureLoggedIn(), async (req, res, next) => {

    if (req.user.userSpotifyData) {
        const recentlyPlayed = await axios({
            url: `https://api.spotify.com/v1/me/player/recently-played?limit=10`,
            headers: { 'Authorization': `Bearer ${spotyAccessToken}` },
            transformResponse: [(data) => {
                console.log(data);
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

        var updatedUser = await User.findByIdAndUpdate(req.user._id, {
            recentlyPlayed: recentlyPlayed.data,
            currentlyPlaying: currentlyPlaying.data
        });
    }

    let userData = updatedUser || req.user;
    userData.cantBeFriended = true;
    userData.notMe = userData.id !== req.user._id;
    userData.posts = await Post.find({ 'author': req.user._id }).sort({ 'createdAt': -1 });

    res.render("app/profile", { userData });

});

ironSpotyRouter.get("/preferences", ensureLogin.ensureLoggedIn(), async (req, res, next) => {
    res.render('app/preferences', { user: req.user })
});

ironSpotyRouter.get("/preferences-user-info", ensureLogin.ensureLoggedIn(), async (req, res, next) => {
    res.render('app/preferences-user-info')
});

ironSpotyRouter.post("/new-post", ensureLogin.ensureLoggedIn(), async (req, res, next) => {

    const { post_body, post_is_public } = req.body;

    await Post.create({
        author: req.user._id,
        body: post_body,
        posttype: 'post',
        hidden: post_is_public ? true : false
    });

    res.redirect("/profile");
});

ironSpotyRouter.post("/update-user-info", ensureLogin.ensureLoggedIn(), async (req, res, next) => {

    const { password, password_confirm } = req.body;

    if (password === password_confirm) {
        req.flash("error", "Password and Confirm password must match");
        return res.redirect("/preferences-user-info");
    }

    const salt = bcrypt.genSaltSync(bcryptSalt);
    const hashPass = bcrypt.hashSync(password, salt);

    await User.findByIdAndUpdate(_id, {
        password: hashPass
    });

    res.redirect("/update-user-info");
});

ironSpotyRouter.post("/update-user-personal", ensureLogin.ensureLoggedIn(), async (req, res, next) => {

    const { _id } = req.user;
    const { name, lastname, email } = req.body;

    await User.findByIdAndUpdate(_id, {
        name,
        lastname,
        email
    });

    res.redirect("/preferences");
});


// APP INNER - ASYNC FRONTEND'S REQUEST
ironSpotyRouter.get('/chartData', ensureLogin.ensureLoggedIn(), async (req, res, next) => {

    let id = req.query.id || req.user._id;

    const userData = await User.find({ _id: id });
    const ids = userData[0].recentlyPlayed.map(track => track.spotifyId);

    Promise.all(ids.map(id => axios({
        method: 'get',
        url: `https://api.spotify.com/v1/audio-features/${id}`,
        headers: {
            'Authorization': `Bearer ${spotyAccessToken}`
        },
        responseType: 'json'
    })))
        .then(values => { // Retorna array de objetos
            let dance = [[], [], []]

            values.forEach((e) => dance[0].push(e.data.danceability))
            values.forEach((e) => dance[1].push(e.data.energy))
            values.forEach((e) => dance[2].push(e.data.tempo))

            res.json({ data: dance })
        })
})


// APP INNER - WITH PARAMS
ironSpotyRouter.get('/profile/:id', ensureLogin.ensureLoggedIn(), async (req, res, next) => {

    const { id } = req.params;
    const userData = await User.findById(id);

    userData.currentlyPlaying.artists = userData.currentlyPlaying.artists.map(artist => artist.name).join(', ');
    userData.cantBeFriended = req.user.friends.includes(id);
    userData.notMe = userData.id === req.user._id;
    userData.posts = await Post.find({ 'author': id, 'hidden': false }).sort({ 'createdAt': -1 });

    res.render("app/profile", { userData });
})

ironSpotyRouter.get('/befriend/:id', ensureLogin.ensureLoggedIn(), async (req, res, next) => {

    const currentUserId = req.user._id;
    const friendId = req.params.id;

    await User.findByIdAndUpdate(currentUserId, { $push: { friends: friendId } });

    res.redirect("/friends");
})

ironSpotyRouter.get('/unfriend/:id', ensureLogin.ensureLoggedIn(), async (req, res, next) => {

    const currentUserId = req.user._id;
    const friendId = req.params.id;

    await User.findByIdAndUpdate(currentUserId, { $pull: { friends: { $in: [friendId] } } });

    res.redirect("/friends");
})

module.exports = ironSpotyRouter;