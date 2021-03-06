require('dotenv').config();

const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const express = require('express');
const hbs = require('hbs');
const mongoose = require('mongoose');
const logger = require('morgan');
const path = require('path');
const moment = require('moment');

const session = require("express-session");
const MongoStore = require("connect-mongo")(session);

const bcrypt = require("bcrypt");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const User = require("./models/User");
const flash = require("connect-flash");
const DBURL = process.env.DBURL;

mongoose
    .connect(DBURL, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    })
    .then(x => {
        console.log(`Connected to Mongo! Database name: "${x.connections[0].name}"`)
    })
    .catch(err => {
        console.error('Error connecting to mongo', err)
    });

const app_name = require('./package.json').name;
const debug = require('debug')(`${app_name}:${path.basename(__filename).split('.')[0]}`);

const app = express();

// Middleware Setup
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

//Express-session configuration
app.use(
    session({
        secret: "our-passport-local-strategy-app",
        resave: true,
        saveUninitialized: true,
        store: new MongoStore({ mongooseConnection: mongoose.connection })
    })
);
app.use(flash());

// -------------------------------------------
// Passport
// -------------------------------------------

passport.serializeUser((user, cb) => {
    cb(null, user._id);
});

passport.deserializeUser((id, cb) => {
    User.findById(id, (err, user) => {
        if (err) { return cb(err); }
        cb(null, user);
    });
});

passport.use(new LocalStrategy((username, password, next) => {
    User.findOne({ username }, (err, user) => {
        if (err) {
            return next(err);
        }
        if (!user) {
            return next(null, false, { message: "Incorrect username" });
        }
        if (!bcrypt.compareSync(password, user.password)) {
            return next(null, false, { message: "Incorrect password" });
        }

        return next(null, user);
    });
}));

//Initialized passport and passport session as a middleware
app.use(passport.initialize());
app.use(passport.session());

// Express View engine setup
app.use(require('node-sass-middleware')({
    src: path.join(__dirname, 'public'),
    dest: path.join(__dirname, 'public'),
    sourceMap: true
}));

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
app.use(express.static(path.join(__dirname, 'public')));

hbs.registerHelper('moment', function (date) {
    return moment(date).fromNow();
});

app.use((req, res, next) => {
    res.locals.flashMessage = req.flash("error");
    res.locals.user = req.user;
    next();
});

// Routes middleware goes here
const ironSpotyRouter = require("./routes/ironSpotyRouter");
app.use('/', ironSpotyRouter);

module.exports = app;