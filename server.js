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
var liveRooms = {};
var timeshiftRooms = {};
module.exports.liveRooms = liveRooms;
module.exports.timeshiftRooms = timeshiftRooms;

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

  // ドライバーが最初にやってきたときの処理
  socket.on("drive", function(room, startLocation) {
    var timestamp = getTimestamp();
    if (!room) return;
    if (!liveRooms[room]) {
      var data = {
        is_finished: false,
        history: [],
        timestamp_history:[],
        start_time: timestamp,
        start_position: startLocation,
        position: startLocation,
        driver: user,
        party: [],
        viewer: 0,
        pov: {heading: 0, pitch: 0},
        start_pov: {heading: 0, pitch: 0}
      };
      liveRooms[room] = data;
    }
    liveRooms[room].timestamp_history.push(timestamp);
    liveRooms[room].history.push({
      timestamp: timestamp,
      event_type: "party_changed",
      data: {
        user: user,
        party: liveRooms[room].party
      }
    });
    socket.join(room);
    socket.emit("party_changed", liveRooms[room].driver, liveRooms[room].party);
  });

  // ドライバーが移動したときの処理
  socket.on("moved", function(room, position) {
    if (!room) return;
    if (!liveRooms[room]) return;
    var timestamp = getTimestamp();
    liveRooms[room].position = position;
    liveRooms[room].timestamp_history.push(timestamp);
    liveRooms[room].history.push({
      timestamp: timestamp,
      event_type: "moved",
      data: { 
        user: user,
        position: position
      }
    });
    socket.broadcast.to(room).emit("moved", position);
  });

  // ドライバーが視点を変更したときの処理
  socket.on("view_changed", function(room, pov) {
    if (!room) return;
    if (!liveRooms[room]) return;
    var timestamp = getTimestamp();
    liveRooms[room].pov = pov;
    liveRooms[room].timestamp_history.push(timestamp);
    liveRooms[room].history.push({
      timestamp: timestamp,
      event_type: "view_changed",
      data: { 
        user: user,
        pov: pov
      }
    });
    socket.broadcast.to(room).emit("view_changed", pov);
  });

  // ドライバーか同乗者がチャットを送信したときの処理
  socket.on("chat_message", function(room, message) {
    if (!room) return;
    if (!liveRooms[room]) return;
    var timestamp = getTimestamp();
    liveRooms[room].timestamp_history.push(timestamp);
    liveRooms[room].history.push({
      timestamp: timestamp,
      event_type: "chat_message",
      data: { 
        user: user,
        message: message
      }
    });
    socket.broadcast.to(room).emit("chat_message", user.name, message);
    socket.emit("chat_message", user.name, message);
  });

  // 観覧者がやってきたときの処理
  socket.on("view", function(room) {
    if (!room) return;
    if (!liveRooms[room]) return;
    var timestamp = getTimestamp();
    liveRooms[room].viewer++;
    liveRooms[room].timestamp_history.push(timestamp);
    liveRooms[room].history.push({
      timestamp: timestamp,
      event_type: "viewer_changed",
      data: {
        num: liveRooms[room].viewer
      }
    });
    socket.join(room);
    socket.broadcast.to(room).emit("viewer_changed", liveRooms[room].viewer);
    socket.emit("viewer_changed", liveRooms[room].viewer);
    socket.emit("party_changed", liveRooms[room].driver, liveRooms[room].party);
  });

  // 観覧者が同乗者になったときの処理
  socket.on("join", function(room) {
    if (!room) return;
    if (!liveRooms[room]) return;
    var timestamp = getTimestamp();
    var array = liveRooms[room].party.filter(function(v) {
      return (v.name !== user.name);
    });
    liveRooms[room].party = array;
    liveRooms[room].party.push(user);
    liveRooms[room].timestamp_history.push(timestamp);
    liveRooms[room].history.push({
      timestamp: timestamp,
      event_type: "join",
      data: { 
        user: user,
        party: array
      }
    });
    socket.join(room);
    socket.broadcast.to(room).emit("party_changed", liveRooms[room].driver, liveRooms[room].party);
    socket.emit("party_changed", liveRooms[room].driver, liveRooms[room].party);
  });

  // ドライバーがタイムアウトしたときの処理
  socket.on("timeout", function() {
    socket.disconnect();
  });

  // 切断したときの処理
  socket.on("disconnect", function() {
    var timestamp = getTimestamp();
    for(var room in io.sockets.manager.roomClients[socket.id]){
      room = room.slice(1); //roomClientsに入ってるroomは"/"から始まる
      socket.leave(room);
      if (user && liveRooms[room]) {
        // Twitter認証済みのユーザが抜けた場合
        var array = liveRooms[room].party.filter(function(v) {
          return (v.name !== user.name);
        });
        liveRooms[room].party = array;
        liveRooms[room].timestamp_history.push(timestamp);
        liveRooms[room].history.push({
          timestamp: timestamp,
          event_type: "disconnected",
          data: {
            user: user,
            party: array
          }
        });

        if(user.name == liveRooms[room].driver.name) {
          console.log("finished");
          // ドライバーが抜けた場合、そのセッションは終了
          liveRooms[room].position = liveRooms[room].start_position;
          liveRooms[room].pov = liveRooms[room].start_pov;
          liveRooms[room].history.push({
            timestamp: timestamp,
            event_type: "finished"
          });
          liveRooms[room].is_finished = true;
          socket.broadcast.to(room).emit("finished");
          timeshiftRooms[room] = liveRooms[room];
          delete liveRooms[room];
        } else {
          // 同乗者が抜けたことを通知
          socket.broadcast.to(room).emit("party_changed", liveRooms[room].driver, liveRooms[room].party);
        }
      } else {
        if (liveRooms[room]) {
          // 観覧者が抜けた場合
          liveRooms[room].viewer--;
          socket.broadcast.to(room).emit("viewer_changed", liveRooms[room].viewer);
        }
      }
      console.log(socket.id + " disconnected from " + room);
    }
  });

  socket.on("get_rooms", function() {
    var liveData = {};
    for (var id in liveRooms) {
      var room = liveRooms[id];
      var element = {
        position: room.position,
        pov: room.pov
      }
      liveData[id] = element;
    }
    var timeshiftData = {};
    for (var id in liveRooms) {
      var room = liveRooms[id];
      var element = {
        position: room.position,
        pov: room.pov
      }
      timeshiftData[id] = element;
    }
    socket.emit("push_liveRooms", liveData);
    socket.emit("push_timeshiftRooms", timeshiftData);
  });

  socket.on("request_history_list", function(room) {
    if(!timeshiftRooms[room]) return;
    socket.emit("history_timestamp", timeshiftRooms[room].start_time, timeshiftRooms[room].timestamp_history);
  });

  socket.on("request_history", function(room, history_num) {
    if(!timeshiftRooms[room] || !timeshiftRooms[room].history[history_num]) return;
    var history_data = timeshiftRooms[room].history[history_num];
    console.log(history_data.event_type, "EVENT_TYPE");
    if(history_data.event_type === "moved") {
      socket.emit("moved", history_data.data.position);
    } else if (history_data.event_type === "view_changed") {
      socket.emit("view_changed", history_data.data.pov);
    } else if (history_data.event_type === "chat_message") {
      socket.emit("chat_message", history_data.data.user.name, history_data.data.message);
    } else if (history_data.event_type === "finished") {
      socket.emit("finished");
    } else if (history_data.event_type === "viewer_changed") {
      socket.emit("viewer_changed", history_data.data.num);
    } else {
      //case "party_changed":
      //case "join":
      //case "disconnected":
        socket.emit("party_changed", history_data.data.user, history_data.data.party);
    }
  });
});

var getTimestamp = function() {
  return (new Date()).getTime();
};
