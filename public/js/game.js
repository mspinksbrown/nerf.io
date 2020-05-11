//ANCHOR Pixi Settings
/* -------------------------------------------------------------------------- */
/*                            GLOBAL PIXI SETTINGS                            */
/* -------------------------------------------------------------------------- */

PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;

//ANCHOR Game Defaults
/* -------------------------------------------------------------------------- */
/*                                  DEFAULTS                                  */
/* -------------------------------------------------------------------------- */

const WIDTH = window.innerWidth;
const HEIGHT = window.innerHeight;

//ANCHOR Renderer Settings
/* -------------------------------------------------------------------------- */
/*                                  RENDERER                                  */
/* -------------------------------------------------------------------------- */

let renderer = new PIXI.Renderer({
  width: WIDTH,
  height: HEIGHT,
  autoResize: true,
  resolution: window.devicePixelRatio,
  backgroundColor: 0xbbe773,
});
document.body.appendChild(renderer.view);
let viewport = new PIXI.Container();

//ANCHOR Ticker
/* -------------------------------------------------------------------------- */
/*                                   TICKER                                   */
/* -------------------------------------------------------------------------- */

let ticker = PIXI.Ticker.shared;
ticker.add(function (delta) {
  renderer.render(viewport);
});

//ANCHOR Network Variables
/* -------------------------------------------------------------------------- */
/*                               NETWORK OBJECTS                              */
/* -------------------------------------------------------------------------- */

let player, otherPlayer, socket;

//ANCHOR Player Settings
/* -------------------------------------------------------------------------- */
/*                              PLAYER PARAMETERS                             */
/* -------------------------------------------------------------------------- */

var playerSettings = {
  speed: 2,
  zoom: 2,
  direction: 0,
};

let menu = new PIXI.Container();

let currentAnimation = 0;
let anim;
//viewport.scale.set(2);

//game.stage.addChild(viewport);

//ANCHOR Preload
/* -------------------------------------------------------------------------- */
/*                               PRELOAD ASSETS                               */
/* -------------------------------------------------------------------------- */

PIXI.Loader.shared
  .add("idle", "../../assets/images/anims/idle.json")
  .add("walk", "../../assets/images/anims/walk.json")
  .add("LarcenyFont", "../../assets/fonts/Larceny/Larceny.xml.fnt")
  .load(initialize);

//ANCHOR Initialize
/* -------------------------------------------------------------------------- */
/*                           INITIALIZE APPLICATION                           */
/* -------------------------------------------------------------------------- */

function initialize() {
  var keys = {};

  //ANCHOR Add players to Socket
  /* -------------------------------------------------------------------------- */
  /*                            ADD PLAYERS TO SERVER                           */
  /* -------------------------------------------------------------------------- */

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

  //ANCHOR Input Function
  /* -------------------------------------------------------------------------- */
  /*                            DECLARE INPUT EVENTS                            */
  /* -------------------------------------------------------------------------- */

  function input() {
    window.addEventListener("keydown", keysDown);
    window.addEventListener("keyup", keysUp);

    ticker.add(update);
  }

  function keysDown(e) {
    console.log(e.keyCode);
    keys[e.keyCode] = true;
  }

  function keysUp(e) {
    keys[e.keyCode] = false;
  }

  //ANCHOR Update (Tick)
  /* -------------------------------------------------------------------------- */
  /*                                UPDATE (TICK)                               */
  /* -------------------------------------------------------------------------- */

  function update(delta) {
    player.vx = playerSettings.speed;
    player.vy = playerSettings.speed;

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
  }

  //ANCHOR Add Players
  /* -------------------------------------------------------------------------- */
  /*                           ADD PLAYER TO VIEWPORT                           */
  /* -------------------------------------------------------------------------- */

  function addPlayer(self, playerInfo) {
    let idle = PIXI.Loader.shared.resources["walk"].spritesheet;
    let anim_idle = new PIXI.AnimatedSprite(idle.animations["walk"]);
    anim_idle.animationSpeed = 0.75;
    anim_idle.play();

    playerSprite = new PIXI.Container();
    playerSprite.scale.set(0.1);
    playerSprite.addChild(anim_idle);

    player = viewport.addChild(playerSprite);

    const playerName = new PIXI.BitmapText(playerInfo.name, {
      font: "100px Larceny",
      align: "center",
    });

    player.addChild(playerName);
    player.x = playerInfo.x;
    player.y = playerInfo.y;
    player.vx = 0;
    player.vy = 0;
    player.pivot.x = 185 / 2;
    player.pivot.y = 105 / 2;

    input();
  }

  //ANCHOR Add Other Players
  /* -------------------------------------------------------------------------- */
  /*                        ADD OTHER PLAYERS TO VIEWPORT                       */
  /* -------------------------------------------------------------------------- */

  function addOtherPlayers(self, playerInfo) {
    let idle = PIXI.Loader.shared.resources["walk"].spritesheet;
    let anim_idle = new PIXI.AnimatedSprite(idle.animations["walk"]);
    anim_idle.animationSpeed = 0.5;
    anim_idle.play();

    otherPlayerSprite = new PIXI.Container();
    otherPlayerSprite.scale.set(0.1);
    otherPlayerSprite.addChild(anim_idle);

    const otherPlayer = self.otherPlayers.addChild(otherPlayerSprite);
    otherPlayer.playerId = playerInfo.playerId;
    otherPlayer.x = playerInfo.x;
    otherPlayer.y = playerInfo.y;

    viewport.addChild(otherPlayer);
  }

  function zoom() {
    const scaleDelta = 0.01;

    offsetX = -(player.x * scaleDelta);
    offsetY = -(player.y * scaleDelta);

    const currentScale = viewport.scale.x;
    let nscale = currentScale + scaleDelta;

    if (nscale < playerSettings.zoom) {
      playerSprite.pivot.x = 0;
      playerSprite.pivot.y = 0;
      viewport.position.x += offsetX;
      viewport.position.y += offsetY;
      viewport.scale.set(nscale);
    }
  }
}
/*
  function debugCollision() {
    playerRectX = playerSprite.getBounds().x;
    playerRectY = playerSprite.getBounds().y;
    playerRectW = playerSprite.getBounds().width;
    playerRectH = playerSprite.getBounds().height;
    var debug = new PIXI.Graphics();
    debug.name = `debug`;
    debug.alpha = 0.01;
    debug.beginFill(0xffff00);
    debug.lineStyle(1, 0xff0000);
    debug.drawRect(playerRectX, playerRectY, playerRectW, playerRectH);
    game.stage.addChild(debug);
  }
}

function serverUpdate(delta) {
  socket.on("gameUpdate", function (msg) {
    console.log(msg);
    location.reload();
  });
}

scroll() {
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
