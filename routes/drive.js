exports.index = function(req, res) {
  var start = req.session.start;
  console.log("start: " + start);
  if (start) {
    if (start === "東京" || start.toLowerCase() === "tokyo") {
      start = "都庁前";
    } else if (start == "大阪" || start.toLowerCase() === "osaka") {
      start = "梅田";
    }

    res.render('drive', {
      start: start,
      user: req.session.passport.user,
      icon: req.session.passport.icon
    });
  } else {
    //TODO: 途中参加した人の処理
    res.send("途中参加した人の処理はまだです");
  }
};
