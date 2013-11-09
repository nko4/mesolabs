
/*
 * GET home page.
 */
var crypto = require('crypto'),
    sha1sum = crypto.createHash('sha1');

exports.index = function(req, res){
  res.render('index', {
      title: 'Drive Share!!',
      user: req.session.passport.user,
      icon: req.session.passport.icon
  });
};

exports.new = function(req, res) {
  //TODO: 新規セッション開始の処理（認証やら何やら）
  sha1sum.update(req.body.place + new Date().getTime());
  res.redirect("/" + sha1sum.digest("hex"));
}