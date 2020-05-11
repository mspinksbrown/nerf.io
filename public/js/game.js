//ANCHOR Pixi Settings
/* -------------------------------------------------------------------------- */
/*                            GLOBAL PIXI SETTINGS                            */
/* -------------------------------------------------------------------------- */

PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;

//ANCHOR Game Defaults
/* -------------------------------------------------------------------------- */
/*                                  DEFAULTS                                  */
/* -------------------------------------------------------------------------- */

const app = new PIXI.Application();
var keys = {};
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
let viewport = new Viewport.Viewport({
  screenWidth: window.innerWidth,
  screenHeight: window.innerHeight,
  worldWidth: 1000,
  worldHeight: 1000,

  interaction: renderer.plugins.interaction, // the interaction module is important for wheel to work properly when renderer.v
});

//ANCHOR Ticker
/* -------------------------------------------------------------------------- */
/*                                   TICKER                                   */
/* -------------------------------------------------------------------------- */

var ticker = new Smoothie({
  engine: PIXI,
  renderer: renderer,
  root: viewport,
  fps: 60,
  update: update.bind(this),
  interpolate: true,
});

//ANCHOR Network Variables
/* -------------------------------------------------------------------------- */
/*                               NETWORK OBJECTS                              */
/* -------------------------------------------------------------------------- */

var player, otherPlayer, socket;

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
  .add("austin", "../../assets/images/austin.json")
  .add("LarcenyFont", "../../assets/fonts/Larceny/Larceny.xml.fnt")
  .load(initialize);

//ANCHOR Initialize
/* -------------------------------------------------------------------------- */
/*                           INITIALIZE APPLICATION                           */
/* -------------------------------------------------------------------------- */

function initialize() {
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

  //ANCHOR Add Players
  /* -------------------------------------------------------------------------- */
  /*                           ADD PLAYER TO VIEWPORT                           */
  /* -------------------------------------------------------------------------- */

  function addPlayer(self, playerInfo) {
    let idle = PIXI.Loader.shared.resources["austin"].spritesheet;
    let anim_idle = new PIXI.AnimatedSprite(idle.animations["idle"]);
    anim_idle.animationSpeed = 0.75;
    anim_idle.play();

    playerSprite = new PIXI.Container();
    playerSprite.scale.set(0.1);
    playerSprite.addChild(anim_idle);

    player = viewport.addChild(playerSprite);

    /*
    const playerName = new PIXI.BitmapText(playerInfo.name, {
      font: "100px Larceny",
      align: "center",
    });
    */

    //player.addChild(playerName);
    player.x = playerInfo.x;
    player.y = playerInfo.y;
    player.vx = playerSettings.speed;
    player.vy = playerSettings.speed;
    player.pivot.x = 185 / 2;
    player.pivot.y = 105 / 2;

    input();
  }

  //ANCHOR Add Other Players
  /* -------------------------------------------------------------------------- */
  /*                        ADD OTHER PLAYERS TO VIEWPORT                       */
  /* -------------------------------------------------------------------------- */

  function addOtherPlayers(self, playerInfo) {
    let idle = PIXI.Loader.shared.resources["austin"].spritesheet;
    let anim_idle = new PIXI.AnimatedSprite(idle.animations["idle"]);
    anim_idle.animationSpeed = 0.75;
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
}

//ANCHOR Input Function
/* -------------------------------------------------------------------------- */
/*                            DECLARE INPUT EVENTS                            */
/* -------------------------------------------------------------------------- */

function input() {
  window.addEventListener("keydown", keysDown);
  window.addEventListener("keyup", keysUp);
}

function keysDown(e) {
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
  //player.vx = playerSettings.speed;
  //player.vy = playerSettings.speed;

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
  //zoom();
  camera();
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

function camera() {
  viewport.follow(player);
  viewport.setZoom(1.5);
}

ticker.start();
