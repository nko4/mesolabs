
/*
 * GET home page.
 */
var crypto = require('crypto');

exports.index = function(req, res){
  req.session = null;
  res.render('index', { title: 'Walk-Sharing' });
};

exports.new = function(req, res) {
  req.session.start = req.body.place;
  req.session.room = null;
  res.redirect("/auth/twitter");
};

exports.join = function(req, res) {
  req.session.start = null;
  req.session.room = req.query.room;
  res.redirect("/auth/twitter");
};

exports.callback = function(req, res) {
  if (req.session.room) {
    // 既存ルームに加わる場合
    res.redirect("/" + req.session.room);
  } else {
    // 新規ルームの場合
    var sha1sum = crypto.createHash('sha1');
    sha1sum.update(req.user.name + new Date().getTime());
    res.redirect("/" + sha1sum.digest("hex"));
  }
};

exports.logout = function(req, res) {
  req.session.destroy();
  req.logout();
  res.send("session timed out. <a href='/'> *TOP* </a>");
}