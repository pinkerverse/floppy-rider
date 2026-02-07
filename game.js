/* =====================
   CANVAS SETUP
===================== */

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 360;
canvas.height = 640;

/* =====================
   IMAGE LOADING
===================== */

const backgrounds = [];
for (let i = 1; i <= 5; i++) {
  const img = new Image();
  img.src = `images/bg${i}.png`;
  backgrounds.push(img);
}

const shipIdle = new Image();
shipIdle.src = "images/ship_idle.png";

const shipBoostFrames = [];
for (let i = 1; i <= 4; i++) {
  const img = new Image();
  img.src = `images/ship_boost${i}.png`;
  shipBoostFrames.push(img);
}

const pillarImg = new Image();
pillarImg.src = "images/pillar.png";

/* =====================
   GAME STATE
===================== */

let gameStarted = false;
let gameOver = false;
let score = 0;

/* =====================
   BACKGROUND (PING-PONG)
===================== */

let bgFrameIndex = 0;
let bgDirection = 1;
let bgTimer = 0;
const BG_FRAME_TIME = 70;

/* =====================
   SHIP
===================== */

const ship = {
  x: 80,
  y: 300,
  width: 64,
  height: 48,
  velocity: 0,
  gravity: 0.68,
  lift: -11
};

let boosting = false;
let boostFrame = 0;
let boostTimer = 0;

/* =====================
   HITBOX TUNING
===================== */

const SHIP_HITBOX_PADDING = { x: 10, y: 8 };
const PILLAR_HITBOX_PADDING = { x: 6, y: 6 };

/* =====================
   PIPES
===================== */

const pipes = [];
const pipeWidth = 60;
const gap = 150;
let pipeTimer = 0;
let pipeSpeed = 2.5;

/* =====================
   INPUT
===================== */

document.addEventListener("keydown", handleInput);
document.addEventListener("touchstart", handleInput);
document.addEventListener("keyup", () => boosting = false);
document.addEventListener("touchend", () => boosting = false);

function handleInput() {
  if (!gameStarted) {
    startGame();
    return;
  }
  if (gameOver) {
    resetGame();
    return;
  }
  ship.velocity = ship.lift;
  boosting = true;
}

function startGame() {
  gameStarted = true;
  ship.velocity = ship.lift;
  boosting = true;
}

/* =====================
   GAME LOOP
===================== */

let lastTime = 0;

function update(time) {
  const delta = time - lastTime;
  lastTime = time;

  /* ----- BACKGROUND ----- */
  bgTimer += delta;
  if (bgTimer > BG_FRAME_TIME) {
    bgFrameIndex += bgDirection;
    if (bgFrameIndex === backgrounds.length - 1) bgDirection = -1;
    if (bgFrameIndex === 0) bgDirection = 1;
    bgTimer = 0;
  }

  ctx.drawImage(backgrounds[bgFrameIndex], 0, 0, canvas.width, canvas.height);

  /* ----- START SCREEN ----- */
  if (!gameStarted) {
    drawText("TAP TO PLAY", canvas.height / 2);
    drawText("ARCADE MODE", canvas.height / 2 + 40, 18);
    requestAnimationFrame(update);
    return;
  }

  /* ----- GAME OVER SCREEN ----- */
  if (gameOver) {
    drawText("GAME OVER", canvas.height / 2 - 20);
    drawText(`SCORE: ${score}`, canvas.height / 2 + 20);
    drawText("TAP TO RESTART", canvas.height / 2 + 60, 18);
    requestAnimationFrame(update);
    return;
  }

  /* ----- SHIP PHYSICS ----- */
  ship.velocity += ship.gravity;
  ship.y += ship.velocity;

  /* ----- SHIP DRAW ----- */
  let shipImg = shipIdle;
  if (boosting) {
    boostTimer += delta;
    if (boostTimer > 50) {
      boostFrame = (boostFrame + 1) % shipBoostFrames.length;
      boostTimer = 0;
    }
    shipImg = shipBoostFrames[boostFrame];
  } else {
    boostFrame = 0;
  }

  ctx.save();
  ctx.translate(ship.x + ship.width / 2, ship.y + ship.height / 2);
  ctx.rotate(ship.velocity * 0.035);
  ctx.drawImage(shipImg, -ship.width / 2, -ship.height / 2, ship.width, ship.height);
  ctx.restore();

  /* ----- PIPE SPAWN ----- */
  pipeTimer += delta;
  if (pipeTimer > 1300) {
    const top = Math.random() * (canvas.height - gap - 120) + 60;
    pipes.push({
      x: canvas.width,
      top,
      bottom: canvas.height - top - gap,
      passed: false
    });
    pipeTimer = 0;
  }

  /* ----- PIPES + COLLISION ----- */
  pipes.forEach(pipe => {
    pipe.x -= pipeSpeed;

    // Draw top (flipped)
    ctx.save();
    ctx.translate(pipe.x + pipeWidth / 2, pipe.top / 2);
    ctx.scale(1, -1);
    ctx.drawImage(pillarImg, -pipeWidth / 2, -pipe.top / 2, pipeWidth, pipe.top);
    ctx.restore();

    // Draw bottom
    ctx.drawImage(
      pillarImg,
      pipe.x,
      canvas.height - pipe.bottom,
      pipeWidth,
      pipe.bottom
    );

    // HITBOXES
    const shipHitbox = {
      x: ship.x + SHIP_HITBOX_PADDING.x,
      y: ship.y + SHIP_HITBOX_PADDING.y,
      width: ship.width - SHIP_HITBOX_PADDING.x * 2,
      height: ship.height - SHIP_HITBOX_PADDING.y * 2
    };

    const topHitbox = {
      x: pipe.x + PILLAR_HITBOX_PADDING.x,
      y: 0,
      width: pipeWidth - PILLAR_HITBOX_PADDING.x * 2,
      height: pipe.top - PILLAR_HITBOX_PADDING.y
    };

    const bottomHitbox = {
      x: pipe.x + PILLAR_HITBOX_PADDING.x,
      y: canvas.height - pipe.bottom + PILLAR_HITBOX_PADDING.y,
      width: pipeWidth - PILLAR_HITBOX_PADDING.x * 2,
      height: pipe.bottom - PILLAR_HITBOX_PADDING.y
    };

    if (
      rectsOverlap(shipHitbox, topHitbox) ||
      rectsOverlap(shipHitbox, bottomHitbox)
    ) {
      gameOver = true;
    }

    if (!pipe.passed && pipe.x + pipeWidth < ship.x) {
      score++;
      pipe.passed = true;
    }
  });

  if (pipes.length && pipes[0].x < -pipeWidth) pipes.shift();

  /* ----- BOUNDS ----- */
  if (ship.y < 0 || ship.y + ship.height > canvas.height) {
    gameOver = true;
  }

  /* ----- HUD ----- */
  ctx.fillStyle = "white";
  ctx.font = "22px Arial";
  ctx.fillText(score, 20, 40);

  requestAnimationFrame(update);
}

/* =====================
   RESET
===================== */

function resetGame() {
  ship.y = 300;
  ship.velocity = 0;
  pipes.length = 0;
  score = 0;
  gameOver = false;
  boosting = false;
  boostFrame = 0;
  pipeTimer = 0;
}

/* =====================
   HELPERS
===================== */

function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function drawText(text, y, size = 26) {
  ctx.fillStyle = "white";
  ctx.font = `${size}px Arial`;
  ctx.textAlign = "center";
  ctx.fillText(text, canvas.width / 2, y);
  ctx.textAlign = "left";
}

/* =====================
   START
===================== */

requestAnimationFrame(update);
