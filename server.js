require('nko')('U1rZVPYW41lBOHw9');
var express = require('express');
var routes = require('./routes');
var drive = require('./routes/drive');
var http = require('http');
var path = require('path');
var sio = require('socket.io');
var auth = require('./auth');

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
app.use(auth.passport.initialize());
app.use(auth.passport.session());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if (!isProduction) {
  app.use(express.errorHandler());
}

app.get('/', routes.index);
app.post('/new', routes.new);
app.get('/auth/twitter', auth.passport.authenticate('twitter'));
app.get('/auth/twitter/callback', auth.passport.authenticate('twitter', {failureRedirect: "/"}), routes.callback);
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

var io = sio.listen(server);
io.sockets.on("connection", function(socket) {
  var username = auth.passport.session.user;

  socket.on("moved", function(position, room) {
    if(!room) return;
    var timestamp = getTimestamp();
    console.log(position, timestamp);
    socket.broadcast.to(room).emit("moved", position, timestamp);
    // TODO: データ保存
  });
  
  socket.on("view_changed", function(pov, room) {
    if(!room) return;
    var timestamp = getTimestamp();
    console.log(pov, timestamp);
    socket.broadcast.to(room).emit("view_changed", pov, timestamp);
    // TODO: データ保存
  });

  socket.on("chat_message", function(message, room) {
    console.log(io.sockets.manager.roomClients[socket.id]);
    if(!room) return;
    var timestamp = getTimestamp();
    console.log(message, timestamp);
    socket.broadcast.to(room).emit("chat_message", username, message, timestamp);
    socket.emit("chat_message", username, message, timestamp);
    //TODO: 何の情報を送受信するべきか要相談
  });

  socket.on("join", function(room) {
    console.log("join", socket.id, room);
    socket.join(room);
    //TODO: 入室メッセージを流す？
  });

  socket.on("disconnect", function() {
    for(var room in io.sockets.manager.roomClients[socket.id]){
      //socket.leave(room);
      if(room) {
        //TODO: 特定ルームに入っている場合、退室メッセージを流す？
        console.log(socket.id + " disconnected from " + room);
      }
    }
  });
});

var getTimestamp = function() {
  return (new Date()).getTime();
};
