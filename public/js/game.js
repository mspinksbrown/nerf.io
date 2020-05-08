const WIDTH = 1920;
const HEIGHT = 1080;

var configuration = {
  width: WIDTH,
  height: HEIGHT,
  autoResize: true,
  resolution: devicePixelRatio,
  backgroundColor: 0xfaf7dc,
};

let player, otherPlayer, socket;

let keys = {};

let game = new PIXI.Application(configuration);

document.body.appendChild(game.view);
game.renderer.resize(window.innerWidth, window.innerHeight);

frontLoader = game.loader;
preload();

function preload() {
  //frontLoader.baseURL = "../../assets";
  frontLoader.add("player", "../../assets/head.png");
  //frontLoader.onProgress.add(loadProgress);
  //frontLoader.onComplete.add(doneLoading);
  //frontLoader.onError.add(loadError);

  frontLoader.load(initialize);
}

function initialize() {
  var self = this;
  this.socket = io();
  socket = this.socket;
  this.otherPlayers = new PIXI.Container();
  game.stage.addChild(self.otherPlayers);
  this.socket.on("currentPlayers", function (players) {
    Object.keys(players).forEach(function (id) {
      if (players[id].playerId === self.socket.id) {
        addPlayer(self, players[id]);
      } else {
        addOtherPlayers(self, players[id]);
      }
    });
  });
  this.socket.on("newPlayer", function (playerInfo) {
    addOtherPlayers(self, playerInfo);
  });
  this.socket.on("disconnect", function (playerId) {
    self.otherPlayers.children.forEach(function (otherPlayer) {
      if (playerId === otherPlayer.playerId) {
        otherPlayer.destroy();
      }
    });
  });
  this.socket.on("playerMoved", function (playerInfo) {
    self.otherPlayers.children.forEach(function (otherPlayer) {
      if (playerInfo.playerId === otherPlayer.playerId) {
        //otherPlayer.pivot = playerInfo.rotation;
        otherPlayer.x = playerInfo.x;
        otherPlayer.y = playerInfo.y;
      }
    });
  });
}

function input() {
  window.addEventListener("keydown", keysDown);
  window.addEventListener("keyup", keysUp);

  game.ticker.add(gameLoop);
}

function keysDown(e) {
  console.log(e.keyCode);
  keys[e.keyCode] = true;
}

function keysUp(e) {
  keys[e.keyCode] = false;
}

function gameLoop(delta) {
  player.vx = 1;
  player.vy = 1;

  if (keys["87"]) {
    player.y -= player.vy;
  }
  if (keys["83"]) {
    player.y += player.vy;
  }
  if (keys["65"]) {
    player.x -= player.vx;
  }
  if (keys["68"]) {
    player.x += player.vx;
  }

  var x = player.x;
  var y = player.y;
  //var r = player.pivot;

  if (
    player.oldPosition &&
    (x !== player.oldPosition.x || y !== player.oldPosition.y)
    //r !== player.oldPosition.rotation)
  ) {
    socket.emit("playerMovement", {
      x: player.x,
      y: player.y,
      //rotation: player.pivot,
    });
  }

  player.oldPosition = {
    x: player.x,
    y: player.y,
    //rotation: player.pivot,
  };
}

function addPlayer(self, playerInfo) {
  console.log("Player " + playerInfo.playerId + " has arrived!");
  let playerSprite = PIXI.Sprite.from(frontLoader.resources.player.texture);

  if (playerInfo.team === "blue") {
    playerSprite.tint = 0x0000ff;
  } else {
    playerSprite.tint = 0xff0000;
  }

  player = game.stage.addChild(playerSprite);

  player.x = playerInfo.x;
  player.y = playerInfo.y;
  player.vx = 0;
  player.vy = 0;

  input();
}

function addOtherPlayers(self, playerInfo) {
  console.log("Player " + playerInfo.playerId + " has arrived!");
  let playerSprite = PIXI.Sprite.from(frontLoader.resources.player.texture);
  if (playerInfo.team === "blue") {
    playerSprite.tint = 0x0000ff;
  } else {
    playerSprite.tint = 0xff0000;
  }
  playerSprite.x = playerInfo.x;
  playerSprite.y = playerInfo.y;

  const otherPlayer = self.otherPlayers.addChild(playerSprite);
  otherPlayer.playerId = playerInfo.playerId;
}
