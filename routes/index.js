
/*
 * GET home page.
 */
var crypto = require('crypto');

exports.index = function(req, res){
  req.session = null;
  res.render('index', { title: 'Drive Share!!' });
};

exports.new = function(req, res) {
  //TODO: 新規セッション開始の処理（認証やら何やら）
  var sha1sum = crypto.createHash('sha1');
  sha1sum.update("" + new Date().getTime());
  req.session.start = req.body.place;
  res.redirect("/" + sha1sum.digest("hex"));
}