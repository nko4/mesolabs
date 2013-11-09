
/*
 * GET home page.
 */
var crypto = require('crypto');

exports.index = function(req, res){
  req.session = null;
  res.render('index', { title: 'Drive Share!!' });
};

exports.new = function(req, res) {
  req.session.start = req.body.place;
  res.redirect("/auth/twitter");
};

exports.join = function(req, res) {
  req.session.room = req.query.room;
  console.log(req.session.room);
  res.redirect("/auth/twitter");
};

exports.callback = function(req, res) {
  console.log("callback method." + req.session.room);
  var name = req.user.screen_name;
  req.session.passport.user = name;
  req.session.passport.icon = req.user.profile_image_url;

  if (req.session.room) {
    // 既存ルームに加わる場合
    res.redirect(req.session.room);
  } else {
    // 新規ルームの場合
    var sha1sum = crypto.createHash('sha1');
    sha1sum.update(name + new Date().getTime());
    res.redirect("/" + sha1sum.digest("hex"));
  }
};

exports.logout = function(req, res) {
  req.session.destroy();
  req.logout();
  res.redirect('/');
}