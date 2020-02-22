const express = require("express");
const passportRouter = express.Router();
// Require user model
const User = require("../models/user");
// Add bcrypt to encrypt passwords
const bcrypt = require("bcrypt");
const bcryptSalt = 10;
// Add passport 
const passport = require("passport");
//Ensure Login

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
  successRedirect: "/private",
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


passportRouter.get("/private", ensureLogin.ensureLoggedIn(), (req, res) => {
  res.render("passport/private", { user: req.user });
});

module.exports = passportRouter;