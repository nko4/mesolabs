// コメント関係
var comments = [];
var fontSize = 25;
var frame = 30; // 1秒辺りのフレーム数
var windowHeight = $(window).height()-2;
var windowWidth = $(window).width()-2;

$(window).resize(function(){
  commentCanvasInit();
});

function commentCanvasInit(){
  // Canvas サイズの初期化
  windowHeight = $(window).height()-2;
  windowWidth = $(window).width()-2;
  $('#comment-canvas').attr('width', windowWidth+'px').attr('height', windowHeight+'px');
  $('#comment-canvas').css('width', windowWidth+'px');
  $('#comment-canvas').css('height', windowHeight+'px');
}

// コメントオブジェクト作成
function createComment(message) {

  var v_space = 5;  // 縦のコメント同士の隙間
  var h_space = 10;  // 横のコメント同士の隙間

  var canvas = $("#comment-canvas")[0];
  var context = canvas.getContext('2d');

  var newComment = {
    msg: message,
    x: $(canvas).width(),
    y: fontSize + v_space,
    width: context.measureText(message).width,
    timestamp: getTimestamp()
  };

  comments.forEach(function (comment) {
    // 既存のコメントとx座標が重なっている && 既存のコメントと新しいコメントが同じ段に居る
    if ((comment.x + comment.width + h_space) > newComment.x && comment.y === newComment.y) {
      newComment.y += fontSize + v_space;
    }

    // canvasの縦幅をはみ出してしまう場合
    if (newComment.y + fontSize + v_space > $(canvas).height()) {
      newComment.y = fontSize + v_space;
    }
  });

  comments.push(newComment);
  if (!commentRenderingIntervalID) startCommentRendering();
}

// コメント描画
function showComments() {
  // TODO: initialize関数を作る
  var canvas = $("#comment-canvas")[0];
  var context = canvas.getContext('2d');
  context.clearRect(0, 0, $(canvas).width(), $(canvas).height());
  context.textAlign = 'left';
  context.textBaseline = 'textBaseline';
  context.font = fontSize + 'px Arial';

  context.lineWidth = 4.0;
  context.strokeStyle = 'black';

  context.fillStyle = 'rgba(255, 255, 255, 1)';

  comments.forEach(
      function (comment) {
        context.strokeText(comment.msg, comment.x, comment.y);
        context.fillText(comment.msg, comment.x, comment.y);
        comment.x -= 5;
      }
  );
}

function commentRender() {
  if (comments[0].x < (-1) * comments[0].width) {
    comments.shift();
  }
  if (comments.length === 0) {
    stopCommentRendering();
    return;
  }
  showComments();
}

var commentRenderingIntervalID = null;
function stopCommentRendering() {
  clearInterval(commentRenderingIntervalID);
  commentRenderingIntervalID = null;
  var canvas = $("#comment-canvas")[0];
  var context = canvas.getContext('2d');
  context.clearRect(0, 0, $(canvas).width(), $(canvas).height());
}

function startCommentRendering() {
  commentRenderingIntervalID = setInterval(commentRender, 1000 / frame);
}