exports.index = function(req, res) {
  var start = req.session.start;

  if (start === "東京" || start.toLowerCase() === "tokyo") {
    start = "都庁前";
  } else if (start == "大阪" || start.toLowerCase() === "osaka") {
    start = "梅田";
  }

  res.render('drive', {start: start});
};