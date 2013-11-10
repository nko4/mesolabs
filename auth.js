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
      return done(null, {name: profile.username, icon: profile.photos[0].value});
    });
  }
));

passport.serializeUser(function (user, done) {
  done(null, user);
});

passport.deserializeUser(function (id, done) {
  done(null, id);
});

exports.passport = passport;