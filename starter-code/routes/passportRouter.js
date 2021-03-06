const express        = require("express");
const passportRouter = express.Router();
// Require user model
const User = require ('../models/user');
// Add bcrypt to encrypt passwords
const bcrypt = require('bcrypt');
// Add passport 
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');
const flash = require('connect-flash');

const ensureLogin = require("connect-ensure-login");

passportRouter.use(session({
  secret: "secret-word",
  resave: true,
  saveUninitialized: true
}));

passportRouter.use(passport.initialize());
passportRouter.use(passport.session());

passport.serializeUser((user, cb) => {
  cb(null, user._id);
});

passport.deserializeUser((id, cb) => {
  User.findById(id, (err, user) => {
    if (err) { return cb(err); }
    cb(null, user);
  });
});

passportRouter.use(flash());

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


passportRouter.get("/private-page", ensureLogin.ensureLoggedIn(), (req, res) => {
  res.render("passport/private", { user: req.user });
});

passportRouter.get("/login", (req, res, next) => {
  res.render("passport/login");
});

passportRouter.post("/login", passport.authenticate("local", {
  successRedirect: "/",
  failureRedirect: "/passport/login",
  failureFlash: true,
  passReqToCallback: true
}));

passportRouter.get("/signup", (req, res) => {
  res.render("passport/signup", { user: req.user });
});


passportRouter.post("/signup", (req, res, next) => {
  
  let {username, password} = req.body;

	if (username === "" || password === "") {
		res.render("passport/signup", {
      message: "Indicate username and password"
		});
		return;
	}

	User.findOne({
			username
		})
		.then(user => {
			if (user !== null) {
				res.render("passport/signup", {
					message: "The username already exists"
				});
				return;
			}

			const hashPass = bcrypt.hashSync(password, bcrypt.genSaltSync(10));

			const newUser = new User({
				username,
				password: hashPass
			});

			newUser.save((err) => {
				if (err) {
					res.render("passport/signup", {
            message: "Something went wrong"
					});
				} else {
					res.redirect("/");
				}
			});
		})
		.catch(error => {
			next(error)
		})
});

module.exports = passportRouter;