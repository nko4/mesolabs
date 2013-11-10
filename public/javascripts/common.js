function createMap(latlng) {
  var mapOptions = {
    center: latlng,
    zoom: 15,
    mapTypeId: google.maps.MapTypeId.ROADMAP
  };
  return new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
}

function createPanorama(latlng, pov, linkControl) {
  var panoOptions = {
    position: latlng,
    addressControlOptions: {
      position: google.maps.ControlPosition.TOP_RIGHT
    },
    linksControl: linkControl,
    panControl: false,
    zoomControl: false,
    enableCloseButton: false,
    clickToGo: false,
    disableDoubleClickZoom: false,
    scrollwheel: false,
    pov: pov,
    visible: true
  };
  return new google.maps.StreetViewPanorama(document.getElementById('streetview-canvas'), panoOptions);
}

function addPositionChangedListener(panorama, map, isDriver) {
  var prev = null;
  // 移動したときの処理
  google.maps.event.addListener(panorama, "position_changed", function () {
    var position = panorama.getPosition();

    // 動いてないのに呼ばれることがあるので防御策
    if (prev && prev.nb === position.nb && prev.ob === position.ob) {
      prev = position;
      return;
    }
    prev = position;

    // 右下マップの位置を更新
    map.setCenter(panorama.getPosition());

    // 他のメンバに新しい位置を通知する
    if(isDriver) {
      connection.socket.emit("moved", connection.pathname, panorama.getPosition(), getTimestamp());
    }
  });
}

function addPovChangedListener(panorama) {
  // 視点を変更したときの処理
  google.maps.event.addListener(panorama, "pov_changed", function () {
    // 他のメンバに新しい視点を通知する
    connection.socket.emit("view_changed", connection.pathname, panorama.getPov(), getTimestamp());
  });
}

function initialClick(map) {
  // ページ読み込み後、Clickせずともキーボード操作可能にする
  google.maps.event.addListenerOnce(map, 'idle', function () {
    var evt = document.createEvent("MouseEvents");
    evt.initMouseEvent("click", true, true, window, 0, 0, 0, 0, 0, true, true, true, true, 0, null);
    evt.enableKeyAccess = true;
    document.querySelector('svg').dispatchEvent(evt);
  });
}

function sendChat() {
  var message = $('#chat-input').val();
  if (message == "") return false;
  connection.sendMessage(message);
  $('#chat-input').val("");
}

var connection = {};
// pathnameの先頭のスラッシュを除去する
connection.pathname = location.pathname.indexOf('/') == 0 ? location.pathname.slice(1): location.pathname;
connection.socket = io.connect();
connection.disconnect = function() {
  connection.socket.emit("part", connection.pathname);
};
window.onbeforeunload = function(event){
  connection.disconnect();
};
// チャット送信
connection.sendMessage = function(message) {
  connection.socket.emit('chat_message', connection.pathname, message);
};
// チャット受信
connection.socket.on('chat_message', function(username, message) {
  console.log(username + ":" + message);
  createComment(message);
});
connection.socket.on('party_changed', function(driver, party) {
  $("#party-member-list").empty();
  if (driver) {
    $("#party-member-list").append(
        '<li class="party-member-icon" style="background-image: url(' + driver.icon + ');">' +
        '<span class="party-member-name">' + driver.name + '[navigator]</span></li>');
  }
  party.forEach(function(element) {
    $("#party-member-list").append(
        '<li class="party-member-icon" style="background-image: url(' + element.icon + ');">' +
        '<span class="party-member-name">' + element.name + '</span></li>');
  });
});
connection.socket.on('finished', function() {
  console.log("finished");
  $("#caution").empty();
  $("#caution").append("<span>This walk has finished.</span>");
  $("#caution").show();
});
connection.socket.on('viewer_changed', function(num) {
  console.log("count", num);
  $("#count").empty();
  if (num <= 0) {
    // 何も表示しない
  } else if (num == 1) {
    $("#count").append("<span>...and " + num + " other viewer.</span>");
  } else {
    $("#count").append("<span>...and " + num + " other viewers.</span>");
  }
});
getTimestamp = function() {
  return (new Date()).getTime();
};

