//ANCHOR PIXI Settings
/* -------------------------------------------------------------------------- */
/*                            GLOBAL PIXI SETTINGS                            */
/* -------------------------------------------------------------------------- */

PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
PIXI.utils.skipHello();

//ANCHOR Game Defaults
/* -------------------------------------------------------------------------- */
/*                                  DEFAULTS                                  */
/* -------------------------------------------------------------------------- */

const app = new PIXI.Application();
var keys = {};
const WIDTH = window.innerWidth;
const HEIGHT = window.innerHeight;
const primitives = new PIXI.Graphics();
var userSocket;

//ANCHOR Define Renderer Settings
/* -------------------------------------------------------------------------- */
/*                                  RENDERER                                  */
/* -------------------------------------------------------------------------- */

let renderer = new PIXI.Renderer({
  width: WIDTH,
  height: HEIGHT,
  autoResize: true,
  //resolution: window.devicePixelRatio,
  backgroundColor: 0xbbe773,
});
renderer.resize(WIDTH, HEIGHT);
document.body.appendChild(renderer.view);

//ANCHOR Define Viewport Settings
/* -------------------------------------------------------------------------- */
/*                                  VIEWPORT                                  */
/* -------------------------------------------------------------------------- */

let viewport = new Viewport.Viewport({
  screenWidth: window.innerWidth,
  screenHeight: window.innerHeight,

  interaction: renderer.plugins.interaction, // the interaction module is important for wheel to work properly when renderer.v
});

let b = new Bump(PIXI);

//ANCHOR Add Ticker
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

//ANCHOR Declare Network Variables
/* -------------------------------------------------------------------------- */
/*                               NETWORK OBJECTS                              */
/* -------------------------------------------------------------------------- */

let player = new PIXI.Container(),
  otherPlayer = new PIXI.Container(),
  socket;

//ANCHOR Player Settings
/* -------------------------------------------------------------------------- */
/*                              PLAYER PARAMETERS                             */
/* -------------------------------------------------------------------------- */

var playerSettings = {
  speed: 2,
  zoom: 2,
  direction: 0,
  rootNode: new PIXI.Point(),
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
  .add("cubby2", "../../assets/images/map/objects/cubbies_tier2.png")
  .add("LarcenyFont", "../../assets/fonts/Larceny/Larceny.xml.fnt")
  .load(generateMap);

//ANCHOR Map Generation
/* -------------------------------------------------------------------------- */
/*                               MAP GENERATION                               */
/* -------------------------------------------------------------------------- */

function generateMap() {
  var mapSettings = {
    mapWidth: 1000,
    mapHeight: 1000,
  };

  viewport.worldWidth = mapSettings.mapWidth;
  viewport.worldHeight = mapSettings.mapHeight;

  //Spawn Roads
  var createRoads = function () {};

  //After map is fully generated:
  initialize();
}

//ANCHOR Initialize Player
/* -------------------------------------------------------------------------- */
/*                              INITIALIZE PLAYER                             */
/* -------------------------------------------------------------------------- */

function initialize() {
  //ANCHOR Get Player Data from Server
  /* -------------------------------------------------------------------------- */
  /*                            ADD PLAYERS TO SERVER                           */
  /* -------------------------------------------------------------------------- */
  var self = this;
  this.socket = io();
  socket = this.socket;

  let userData = {
    name: localStorage.getItem("Username"),
  };
  socket.emit("playerData", {
    name: userData.name,
  });

  this.otherPlayers = new PIXI.Container();
  viewport.addChild(self.otherPlayers);
  this.socket.on("currentPlayers", function (players) {
    Object.keys(players).forEach(function (id) {
      if (players[id].playerId === self.socket.id) {
        setTimeout(addPlayer(self, players[id]), 1000);
        console.log(userData);
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

  //ANCHOR Add Player (User)
  /* -------------------------------------------------------------------------- */
  /*                           ADD PLAYER TO VIEWPORT                           */
  /* -------------------------------------------------------------------------- */

  function addPlayer(self, playerInfo) {
    let idle = PIXI.Loader.shared.resources["austin"].spritesheet;
    let playerSprite = new PIXI.AnimatedSprite(idle.animations["idle"]);

    playerSprite.resolution = 6;
    playerSprite.animationSpeed = 0.5;
    playerSprite.scale.set(0.1);
    playerSprite.play();

    player.addChild(playerSprite);

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
    //player.pivot.x = 185 / 2;
    //player.pivot.y = 105 / 2;

    playerSettings.rootNode = (player.width / 2, player.height / 2);

    viewport.addChild(primitives);
    viewport.addChild(player);
    input();
  }

  //ANCHOR Add Other Players
  /* -------------------------------------------------------------------------- */
  /*                        ADD OTHER PLAYERS TO VIEWPORT                       */
  /* -------------------------------------------------------------------------- */

  function addOtherPlayers(self, playerInfo) {
    let idle = PIXI.Loader.shared.resources["austin"].spritesheet;
    let otherPlayerSprite = new PIXI.AnimatedSprite(idle.animations["idle"]);

    otherPlayerSprite.animationSpeed = 0.5;
    otherPlayerSprite.scale.set(0.1);
    otherPlayerSprite.play();

    otherPlayer = self.otherPlayers.addChild(otherPlayerSprite);
    otherPlayer.playerId = playerInfo.playerId;
    otherPlayer.x = playerInfo.x;
    otherPlayer.y = playerInfo.y;

    viewport.addChild(otherPlayer);
  }

  //ANCHOR Input Function
  /* -------------------------------------------------------------------------- */
  /*                            DECLARE INPUT EVENTS                            */
  /* -------------------------------------------------------------------------- */

  function input() {
    window.addEventListener("keydown", keysDown);
    window.addEventListener("keyup", keysUp);

    ticker.update = update.bind(this);
  }

  function keysDown(e) {
    keys[e.keyCode] = true;
  }

  function keysUp(e) {
    keys[e.keyCode] = false;
  }
}

//ANCHOR Update (Tick)
/* -------------------------------------------------------------------------- */
/*                                UPDATE (TICK)                               */
/* -------------------------------------------------------------------------- */

function update(delta) {
  player.vx = playerSettings.speed;
  player.vy = playerSettings.speed;

  if (keys["87"]) {
    player.y -= playerSettings.speed;
  }
  if (keys["83"]) {
    player.y += playerSettings.speed;
  }
  if (keys["65"]) {
    player.x -= playerSettings.speed;
  }
  if (keys["68"]) {
    player.x += playerSettings.speed;
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
  collisionDetection();
  drawRootNode();
  renderer.render(viewport);
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
  viewport.setZoom(2);
}

function spawnFurniture() {
  let cubby = new PIXI.Sprite.from(PIXI.Loader.shared.resources["cubby2"].url);
  cubby.x = Math.floor(Math.random() * 700) + 50;
  cubby.y = Math.floor(Math.random() * 500) + 50;
  viewport.addChild(cubby);
}

ticker.start();
spawnFurniture();

function collisionDetection() {
  b.hit(player, otherPlayer, true, true);
}

function drawRootNode() {
  primitives.drawCircle(playerSettings.rootNode, 2);
}
