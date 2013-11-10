exports.index = function(req, res) {
  var start = req.session.start;
  if (start) {
    // ドライバーが開始した場合
    if (start === "東京" || start.toLowerCase() === "tokyo") {
      start = "都庁前";
    } else if (start == "大阪" || start.toLowerCase() === "osaka") {
      start = "大阪市役所";
    } else if (start == "京都" || start.toLowerCase() === "kyoto") {
      start = "京都市役所前";
    }
    req.session.start = null;
    res.render('driver', {
      start: start,
      user: req.session.passport.user.name,
      icon: req.session.passport.user.icon
    });
  } else {
    var liveData = module.parent.exports.liveRooms[req.path.slice(1)];
    var timeshiftData = module.parent.exports.timeshiftRooms[req.path.slice(1)];

    if (liveData) {
      // 途中参加したときの処理
      if (req.session.passport.user) {
        // Twitter認証済みの場合
        res.render('party', {
          nb: liveData.position.nb,
          ob: liveData.position.ob,
          heading: liveData.pov.heading,
          pitch: liveData.pov.pitch,
          user: req.session.passport.user.name,
          icon: req.session.passport.user.icon
        });
      } else {
        // 観覧者の場合
        res.render('viewer', {
          nb: liveData.position.nb,
          ob: liveData.position.ob,
          heading: liveData.pov.heading,
          pitch: liveData.pov.pitch
        });
      }
    } else if (timeshiftData) {
      // タイムシフト再生時の処理
      res.render('timeshift', {
        nb: timeshiftData.position.nb,
        ob: timeshiftData.position.ob,
        heading: timeshiftData.pov.heading,
        pitch: timeshiftData.pov.pitch
      });
    } else {
      res.redirect("/");
    }
  }
};
