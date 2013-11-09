exports.index = function(req, res) {
  var start = req.session.start;
  if (start) {
    if (start === "東京" || start.toLowerCase() === "tokyo") {
      start = "都庁前";
    } else if (start == "大阪" || start.toLowerCase() === "osaka") {
      start = "梅田";
    }

    res.render('driver', {
      start: start,
      user: req.session.passport.user,
      icon: req.session.passport.icon
    });
  } else {
    //TODO: 途中参加した人の処理
    var data = module.parent.exports.rooms[req.path];
    if (!data) {
      res.send("そんなセッションはありません！");
      return;
    }
    if (req.session.passport.user) {
      res.render('party', {
        nb: data.position.nb,
        ob: data.position.ob,
        heading: data.pov.heading,
        pitch: data.pov.pitch,
        user: req.session.passport.user,
        icon: req.session.passport.icon
      });
    } else {
      res.render('viewer', {
        nb: data.position.nb,
        ob: data.position.ob,
        heading: data.pov.heading,
        pitch: data.pov.pitch
      });
    }
  }
};
