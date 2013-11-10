var passport = require('passport')
  , TwitterStrategy = require('passport-twitter').Strategy;

var callbackURL = ((process.env.NODE_ENV === 'production') ? 'http://mesolabs.2013.nodeknockout.com/' : 'http://localhost:8000/') + 'auth/twitter/callback';

var ts = new TwitterStrategy({
      consumerKey: 'e7lfzWKE2QjPFgcDjzObDA',
      consumerSecret: 'M9KWqloBwTixUCfmIKU2Ai7JN3g7DOKAMr6tM3TN0M',
      callbackURL: callbackURL
    },
    function (token, tokenSecret, profile, done) {
      setImmediate(function () {
        console.dir(profile);
        return done(null, {
          name: profile.username,
          icon: profile.photos[0].value,
          oauth_token: token,
          oauth_token_secret: tokenSecret
        });
      });
    }
);

passport.use(ts);

passport.serializeUser(function (user, done) {
  done(null, user);
});

passport.deserializeUser(function (id, done) {
  done(null, id);
});

exports.tweet = function(req, res) {
  ts._oauth.post(
      'https://api.twitter.com/1.1/statuses/update.json',
      req.session.passport.user.oauth_token,
      req.session.passport.user.oauth_token_secret,
      {'status': req.query.msg,
        'lat': req.query.lat,
        'long': req.query.long},
      'application/json',
      function () {
        console.log('DONE');
      }
  );
  res.send();
};

exports.passport = passport;