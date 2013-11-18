exports.index = function(req, res) {
  var liveData = module.parent.exports.liveRooms[req.path.slice(1)];
  var timeshiftData = module.parent.exports.timeshiftRecords.get(req.path.slice(1));
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
    if (liveData) {
      // 途中参加したときの処理
      if (req.session.room) {
        // ROOMがクエリパラメータに入っている = Twitter認証ボタンを押して認証した
        req.session.room = null;
        res.render('party', {
          lat: liveData.position.lat,
          lng: liveData.position.lng,
          heading: liveData.pov.heading,
          pitch: liveData.pov.pitch,
          user: req.session.passport.user.name,
          icon: req.session.passport.user.icon
        });
      } else {
        // 観覧者の場合
        res.render('viewer', {
          lat: liveData.position.lat,
          lng: liveData.position.lng,
          heading: liveData.pov.heading,
          pitch: liveData.pov.pitch
        });
      }
    } else if (timeshiftData) {
      // タイムシフト再生時の処理
      res.render('timeshift', {
        lat: timeshiftData.position.lat,
        lng: timeshiftData.position.lng,
        heading: timeshiftData.pov.heading,
        pitch: timeshiftData.pov.pitch
      });
    } else {
      res.redirect("/");
    }
  }
};
