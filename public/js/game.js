//PIXI Settings
PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;

const WIDTH = 1920;
const HEIGHT = 1080;

var movementSpeed = 2;

var configuration = {
  width: WIDTH,
  height: HEIGHT,
  autoResize: true,
  resolution: devicePixelRatio,
  backgroundColor: 0xfaf7dc,
};

let player, otherPlayer, socket; //Sever objects

let zoomFactor = 2.333,
  direction = 0; //Client-side parameters

let keys = {};

let game = new PIXI.Application(configuration);
let menu = new PIXI.Container();
let viewport = new PIXI.Container();

//viewport.scale.set(2);

document.body.appendChild(game.view);
game.renderer.resize(window.innerWidth, window.innerHeight);
game.stage.addChild(viewport);
//game.stage.addChild(viewport);

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
  viewport.addChild(self.otherPlayers);
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
    viewport.children.forEach(function (otherPlayer) {
      if (playerId === otherPlayer.playerId) {
        otherPlayer.destroy();
      }
    });
  });
  this.socket.on("playerMoved", function (playerInfo) {
    viewport.children.forEach(function (otherPlayer) {
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
  player.vx = movementSpeed;
  player.vy = movementSpeed;

  if (keys["87"]) {
    player.y -= player.vy;
    direction = 1; //Up
  } else if (keys["87"] == false) {
    direction = 0;
  }
  if (keys["83"]) {
    player.y += player.vy;
    direction = 3; //owm
  } else if (keys["83"] == false) {
    direction = 0;
  }
  if (keys["65"]) {
    player.x -= player.vx;
    direction = 2; //Left
  } else if (keys["65"] == false) {
    direction = 0;
  }
  if (keys["68"]) {
    player.x += player.vx;
    direction = 4; // Right
  } else if (keys["68"] == false) {
    direction = 0;
  }

  var x = player.x;
  var y = player.y;
  var r = player.rotation;

  if (
    player.oldPosition &&
    (x !== player.oldPosition.x ||
      y !== player.oldPosition.y ||
      r !== player.oldPosition.rotation)
  ) {
    socket.emit("playerMovement", {
      x: player.x,
      y: player.y,
      rotation: player.rotation,
    });
  }
  player.oldPosition = {
    x: player.x,
    y: player.y,
    rotation: player.rotation,
  };

  zoom();
  //scroll();
}

function addPlayer(self, playerInfo) {
  console.log("Player " + playerInfo.playerId + " has arrived!");
  let playerSprite = PIXI.Sprite.from(frontLoader.resources.player.texture);

  if (playerInfo.team === "blue") {
    playerSprite.tint = 0x0000ff;
  } else {
    playerSprite.tint = 0xff0000;
  }

  player = viewport.addChild(playerSprite);

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

  const otherPlayer = self.otherPlayers.addChild(playerSprite);
  otherPlayer.playerId = playerInfo.playerId;
  otherPlayer.x = playerInfo.x;
  otherPlayer.y = playerInfo.y;

  viewport.addChild(otherPlayer);
}

function zoom() {
  const scaleDelta = 0.01;

  const offsetX = -(player.x * scaleDelta);
  const offsetY = -(player.y * scaleDelta);

  const currentScale = viewport.scale.x;
  let nscale = currentScale + scaleDelta;

  if (nscale < zoomFactor) {
    player.pivot.x = 0;
    player.pivot.y = 0;
    viewport.position.x += offsetX;
    viewport.position.y += offsetY;
    viewport.scale.set(nscale);
  }
}

/* scroll() {
  const scrollDelta = 0.01;

  const offsetX = -(viewport.x * scrollDelta);
  const offsetY = -(viewport.y * scrollDelta);

  switch (direction) {
    default:
      break;
    case 0: //(No Direction)
      viewport.position.x;
      viewport.position.y;
      break;
    case 1: //Up
      viewport.position.y -= offsetY;
      break;
    case 2:
      viewport.position.x -= offsetX;
      break;
    case 3:
      viewport.position.y += offsetY;
      break;
    case 4:
      viewport.position.x += offsetX;
      break;
  }
}
*/
