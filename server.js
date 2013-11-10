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
var sessionStore = new express.session.MemoryStore();
var app = express();
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hjs');
app.set('secretKey', 'mesomeso');
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(express.cookieParser(app.get('secretKey')));
app.use(express.session({
  store: sessionStore
}));
app.use(auth.passport.initialize());
app.use(auth.passport.session());
app.use(express.favicon());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if (!isProduction) {
  app.use(express.errorHandler());
}

app.get('/', routes.index);
app.post('/new', routes.new);
app.get('/join', routes.join);
app.get('/tweet', auth.tweet);
app.get('/auth/twitter', auth.passport.authenticate('twitter'));
app.get('/auth/twitter/callback', auth.passport.authenticate('twitter', {failureRedirect: "/", failureFlash: true}), routes.callback);
app.get('/auth/logout', routes.logout);
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
var rooms = {};
module.exports.rooms = rooms;

io.set('authorization', function(handshakeData, callback) {
  if (handshakeData.headers.cookie) {
    var cookie = require('express/node_modules/cookie').parse(decodeURIComponent(handshakeData.headers.cookie));
    cookie = require('express/node_modules/connect').utils.parseSignedCookies(cookie, app.get('secretKey'));
    var sessionId = cookie["connect.sid"];
    sessionStore.get(sessionId, function(err, session) {
      console.log("sessionId", sessionId);
      console.log("session", session);
      if (err || !session) return callback(err, false);
      handshakeData.session = session;
      callback(null, true);
    });
  } else {
    callback(new Error("cookie not found", false));
  }
});

io.sockets.on("connection", function(socket) {
  var session = socket.handshake.session;
  var user = session.passport.user;
  if(user && user.oauth_token)  delete user.oauth_token;
  if(user && user.oauth_token_secret) delete user.oauth_token_secret;
  console.log("user:", user);

  socket.on("moved", function(room, position) {
    if (!room) return;
    if (!rooms[room]) return;
    var timestamp = getTimestamp();
    console.log("moved:", room, position, timestamp);
    rooms[room].position = position;
    socket.broadcast.to(room).emit("moved", position, timestamp);
    // TODO: データ保存
  });
  
  socket.on("view_changed", function(room, pov) {
    if (!room) return;
    if (!rooms[room]) return;
    var timestamp = getTimestamp();
    console.log("view_changed:", room, pov, timestamp);
    rooms[room].pov = pov;
    socket.broadcast.to(room).emit("view_changed", pov, timestamp);
    // TODO: データ保存
  });

  socket.on("chat_message", function(room, message) {
    console.log(io.sockets.manager.roomClients[socket.id]);
    if (!room) return;
    if (!rooms[room]) return;
    var timestamp = getTimestamp();
    console.log(room, message, timestamp);
    socket.broadcast.to(room).emit("chat_message", user.name, message, timestamp);
    socket.emit("chat_message", user.name, message, timestamp);
    //TODO: データ保存
  });

  socket.on("drive", function(room, startLocation) {
    console.log("drive:", room, socket.id);
    if (!room) return;
    if (!rooms[room]) {
      var timestamp = getTimestamp();
      var data = {
        position: startLocation,
        driver: user,
        party: [],
        viewer: 0,
        pov: {heading: 0, pitch: 0}
      };
      rooms[room] = data;
    }
    socket.join(room);
    socket.emit("party_changed", rooms[room].driver, rooms[room].party);
    console.log(rooms[room]);
  });

  socket.on("view", function(room) {
    if (!room) return;
    if (!rooms[room]) return;
    console.log("view:", room, socket.id);
    rooms[room].viewer++;
    socket.join(room);
    socket.emit("party_changed", rooms[room].driver, rooms[room].party);
  });

  socket.on("join", function(room) {
    if (!room) return;
    if (!rooms[room]) return;
    console.log("join:", room, socket.id);
    var array = rooms[room].party.filter(function(v) {
      return (v.name !== user.name);
    });
    rooms[room].party = array;
    rooms[room].party.push(user);
    socket.join(room);
    socket.broadcast.to(room).emit("party_changed", rooms[room].driver, rooms[room].party);
    socket.emit("party_changed", rooms[room].driver, rooms[room].party);
  });

  socket.on("disconnect", function() {
    for(var room in io.sockets.manager.roomClients[socket.id]){
      room = room.slice(1); //roomClientsに入ってるroomは"/"から始まる
      socket.leave(room);
      if (user && rooms[room]) {
        var array = rooms[room].party.filter(function(v) {
          return (v.name !== user.name);
        });
        rooms[room].party = array;
        socket.broadcast.to(room).emit("party_changed", rooms[room].driver, rooms[room].party);
      }
      //TODO: 特定ルームに入っている場合、退室メッセージを流す？
      console.log(socket.id + " disconnected from " + room);
    }
  });

  socket.on("get_rooms", function() {
    socket.emit("push_rooms", rooms);
  });
});

var getTimestamp = function() {
  return (new Date()).getTime();
};
