require('nko')('U1rZVPYW41lBOHw9');
var express = require('express');
var routes = require('./routes');
var drive = require('./routes/drive');
var http = require('http');
var path = require('path');
var sio = require('socket.io');

var isProduction = (process.env.NODE_ENV === 'production');
var port = (isProduction ? 80 : 8000);
var app = express();
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hjs');
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(express.cookieParser('mesomeso'));
app.use(express.session());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if (!isProduction) {
  app.use(express.errorHandler());
}

app.get('/', routes.index);
app.post('/new', routes.new);
app.get('/:hash', drive.index);

var server = http.createServer(app).listen(port, function(err) {
  if (err) { console.error(err); process.exit(-1); }

  // if run as root, downgrade to the owner of this file
  if (process.getuid() === 0) {
    require('fs').stat(__filename, function(err, stats) {
      if (err) { return console.error(err); }
      process.setuid(stats.uid);
    });
  }

  console.log('Server running at http://0.0.0.0:' + port + '/');
});

io = sio.listen(server);
io.sockets.on("connection", function(socket) {

  socket.on("moved", function(position) {
    // TODO: 部屋分け
    timestamp = getTimestamp();
    console.log(position, timestamp);
    socket.broadcast.emit("moved", position, timestamp);
    // TODO: データ保存
  });
  
  socket.on("view_changed", function(pov) {
    // TODO: 部屋分け
    timestamp = getTimestamp();
    console.log(pov, timestamp);
    socket.broadcast.emit("view_changed", pov, timestamp);
    // TODO: データ保存
  });

  socket.on("chat_message", function(message) {
    timestamp = getTimestamp();
    //TODO: ユーザー情報を取得
    username = "NAME";
    // TODO: 部屋分け
    socket.broadcast.emit("chat_message", username, message, timestamp);
    //TODO: 何の情報を送受信するべきか要相談
  });

});

getTimestamp = function() {
  return (new Date()).getTime();
};
