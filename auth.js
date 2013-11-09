var passport = require('passport')
  , TwitterStrategy = require('passport-twitter').Strategy;

var callbackURL = ((process.env.NODE_ENV === 'production') ? 'http://mesolabs.2013.nodeknockout.com/' : 'http://localhost:8000/') + 'auth/twitter/callback';

passport.use(new TwitterStrategy({
    consumerKey: 'e7lfzWKE2QjPFgcDjzObDA',
    consumerSecret: 'M9KWqloBwTixUCfmIKU2Ai7JN3g7DOKAMr6tM3TN0M',
    callbackURL: callbackURL
  },
  function (token, tokenSecret, profile, done) {
    setImmediate(function () {
      passport.session.user = profile._json.screen_name;
      passport.session.icon = profile._json.profile_image_url;
      console.log(1, passport.session);
      return done(null, profile._json);
    });
  }
));

passport.serializeUser(function (user, done) {
  done(null, user);
});

passport.deserializeUser(function (id, done) {
  console.log(2, passport.session);
  done(null, id);
});

exports.passport = passport;