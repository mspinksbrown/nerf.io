const WIDTH = window.innerWidth * window.devicePixelRatio;
const HEIGHT = window.innerHeight * window.devicePixelRatio;

var game = new Phaser.Game({
  type: Phaser.CANVAS,
  parent: "phaser-example",
  width: WIDTH,
  height: HEIGHT,
  physics: {
    default: "arcade",
    arcade: {
      debug: false,
      gravity: { y: 0 },
    },
  },
  scene: {
    preload: preload,
    create: create,
    update: update,
  },
});

var player;
var playerCamera;
var userData;

var playerSettings = {
  speed: 600,
};

var scaleRatio = window.devicePixelRatio / 3;

var gameObjects = [];

var animIndex = 0;

//ANCHOR Preload Assets
/* -------------------------------------------------------------------------- */
/*                               PRELOAD ASSETS                               */
/* -------------------------------------------------------------------------- */

function preload() {
  this.load.multiatlas(
    "austin",
    "../assets/images/skins/austin/austin.json", //Load JSON for respective skin.
    "../assets/images/skins/austin/" //Set path to load respective PNG files from.
  );
}

var anim;
var frameNames;

/* -------------------------------------------------------------------------- */
/*                       INITIALIZE GAME DATA AND ASSETS                      */
/* -------------------------------------------------------------------------- */

function create() {
  /* -------------------------------------------------------------------------- */
  /*                             INITIALIZE GLOBALS                             */
  /* -------------------------------------------------------------------------- */

  playerName = this.add.text(0, 0);

  playerCamera = this.cameras.add(0, 0, WIDTH, WIDTH);
  playerCamera.setZoom(0.6);

  gameObjects.push(playerCamera);

  playerCamera.setBackgroundColor("#bbe773");

  this.keyboard = this.input.keyboard.addKeys("W, A, S, D");

  this.anims.create({
    key: "idle",
    repeat: -1,
    frameRate: 30,
    frames: this.anims.generateFrameNames("austin", {
      prefix: "idle_",
      suffix: ".png",
      start: 0,
      end: 49,
      zeroPad: 3,
    }),
  });
  this.anims.create({
    key: "walk",
    repeat: -1,
    frameRate: 30,
    frames: this.anims.generateFrameNames("austin", {
      prefix: "walk_",
      suffix: ".png",
      start: 0,
      end: 49,
      zeroPad: 3,
    }),
  });

  var self = this;
  this.socket = io();
  socket = this.socket;
  userData = {
    name: localStorage.getItem("Username"),
  };
  socket.emit("playerData", {
    name: userData.name,
  });

  this.otherPlayers = this.physics.add.group();
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
    self.otherPlayers.getChildren().forEach(function (otherPlayer) {
      if (playerId === otherPlayer.playerId) {
        otherPlayer.destroy();
      }
    });
  });

  // emit player movement
  var x = player.x;
  var y = player.y;
  var r = player.rotation;
  if (
    player.oldPosition &&
    (x !== player.oldPosition.x ||
      y !== player.oldPosition.y ||
      r !== player.oldPosition.rotation)
  ) {
    this.socket.emit("playerMovement", {
      x: this.ship.x,
      y: this.ship.y,
      rotation: this.ship.rotation,
    });
  }

  // save old position data
  this.ship.oldPosition = {
    x: this.ship.x,
    y: this.ship.y,
    rotation: this.ship.rotation,
  };
}

/* -------------------------------------------------------------------------- */
/*                                UPDATE METHOD                               */
/* -------------------------------------------------------------------------- */

function update(delta) {
  if (this.keyboard.D.isDown === true) {
    player.setVelocityX(playerSettings.speed);
    animIndex = 1;
  }
  if (this.keyboard.A.isDown === true) {
    player.setVelocityX(-playerSettings.speed);
    animIndex = 1;
  }
  if (this.keyboard.W.isDown === true) {
    player.setVelocityY(-playerSettings.speed);
    animIndex = 1;
  }
  if (this.keyboard.S.isDown === true) {
    player.setVelocityY(playerSettings.speed);
    animIndex = 1;
  }

  //animationController();
}

function addPlayer(self, playerInfo) {
  player = self.physics.add
    .sprite(playerInfo.x, playerInfo.y, "player")
    .setOrigin(0.5, 0.5)
    .setScale(scaleRatio, scaleRatio);
  player.name = userData.name;
  gameObjects.push(player);

  player.anims.load("walk");
  player.anims.load("idle");
  //player.anims.play("idle");
  console.log(gameObjects);
  animIndex = 0;
}
function addOtherPlayers(self, playerInfo) {
  const otherPlayer = self.add
    .sprite(playerInfo.x, playerInfo.y, "otherPlayer")
    .setOrigin(0.5, 0.5)
    .setDisplaySize(53, 40);
  otherPlayer.playerId = playerInfo.playerId;
  self.otherPlayers.add(otherPlayer);
}

function animationController() {
  switch (animIndex) {
    case 0:
      player.anims.play("idle");
      break;
    case 1:
      player.anims.play("walk");
      break;
    default:
      break;
  }
}
