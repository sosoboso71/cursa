// =============================
// REFERINȚE
// =============================
const platformContainer = document.getElementById("platformContainer");
const fxContainer = document.getElementById("fxContainer");
const scoreText = document.getElementById("scoreText"); // ascuns în CSS

// =============================
// CONSTANTE
// =============================
const PLAYER_WIDTH = 120;
const PLAYER_HEIGHT = 120;
const PLATFORM_WIDTH = 260;
const SCROLL_SPEED = 4;

// =============================
// STARE JOC
// =============================
let playerX = 220;
let playerY = 300;
let onPlatform = true;
let jumpState = "none"; // none, up, down
let jumpPeak = 0;
let landingY = 300;

let distance = 0;
let globalLikeCounter = 0;

const platforms = [];

// =============================
// CREARE STICKMAN
// =============================
const player = document.createElement("div");
player.className = "player";
player.style.left = playerX + "px";
player.style.top = playerY + "px";
player.innerHTML = `<img src="stickman.gif" class="player-img">`;
platformContainer.appendChild(player);

// =============================
// HUD PLATFORM — platforma pe care aleargă stickman-ul
// =============================
const hudPlatform = document.createElement("div");
hudPlatform.className = "hud-platform";
hudPlatform.textContent = "0 metri";
platformContainer.appendChild(hudPlatform);

// =============================
// UI
// =============================
function updateDistanceUI() {
    const text = distance + " metri";
    hudPlatform.textContent = text; // doar HUD-ul, scoreText e ascuns
}

// =============================
// PLATFORME
// =============================
function createPlatform(x, y, type = "start", power = 1) {
    const el = document.createElement("div");
    el.className = "platform platform-" + type;
    el.style.left = x + "px";
    el.style.top = y + "px";

    platformContainer.appendChild(el);
    platforms.push({ el, x, y, power, isNew: true });
}

function spawnPlatform(type, profileUrl, user, power) {
    const x = 600;
    const y = 540; // poziție fixă, identică cu platforma de start

    createPlatform(x, y, type, power);

    const p = platforms[platforms.length - 1].el;

    if (profileUrl) {
        const img = document.createElement("img");
        img.src = profileUrl;
        img.style.width = "40px";
        img.style.height = "40px";
        img.style.borderRadius = "50%";
        img.style.objectFit = "cover";
        p.appendChild(img);
    }

    const label = document.createElement("span");
    label.style.color = "#fff";
    label.style.fontSize = "18px";
    label.textContent = `${user} +${power}`;
    p.appendChild(label);
}

function updatePlatforms() {
    for (let i = platforms.length - 1; i >= 0; i--) {
        const p = platforms[i];
        p.x -= SCROLL_SPEED;
        p.el.style.left = p.x + "px";

        if (p.x + PLATFORM_WIDTH < -200) {
            p.el.remove();
            platforms.splice(i, 1);
        }
    }
}

// =============================
// COLIZIUNI
// =============================
function handleCollisions() {
    const feet = playerY + PLAYER_HEIGHT;
    onPlatform = false;

    for (const p of platforms) {
        const pLeft = p.x;
        const pRight = p.x + PLATFORM_WIDTH;
        const pTop = p.y;

        const horizontallyAligned =
            playerX + PLAYER_WIDTH > pLeft &&
            playerX < pRight;

        const isLanding =
            horizontallyAligned &&
            feet >= pTop - 10 &&
            feet <= pTop + 30;

        if (isLanding) {
            playerY = pTop - PLAYER_HEIGHT;
            landingY = pTop - PLAYER_HEIGHT;
            onPlatform = true;

            if (p.isNew) {
                distance += p.power;
                updateDistanceUI();
                p.isNew = false;

                jumpState = "up";
                jumpPeak = playerY - 120;
            }

            break;
        }
    }
}

// =============================
// GAME LOOP
// =============================
function gameLoop() {

    // SĂRITURĂ
    if (jumpState === "up") {
        playerY -= 12;
        if (playerY <= jumpPeak) {
            jumpState = "down";
        }
    }

    if (jumpState === "down") {
        playerY += 12;
        if (playerY >= landingY) {
            playerY = landingY;
            jumpState = "none";
        }
    }

    // POZIȚIE STICKMAN
    player.style.left = playerX + "px";
    player.style.top = playerY + "px";

    // HUD — FIX SUB STICKMAN
    hudPlatform.style.left = (playerX - 20) + "px";
    hudPlatform.style.top = (playerY + PLAYER_HEIGHT + 10) + "px";

    updatePlatforms();
    handleCollisions();

    requestAnimationFrame(gameLoop);
}

// =============================
// RESET
// =============================
function resetGame() {
    distance = 0;
    updateDistanceUI();

    playerX = 220;
    playerY = 300;
    landingY = 300;
    jumpState = "none";

    platforms.forEach(p => p.el.remove());
    platforms.length = 0;

    createPlatform(200, 540, "start", 1);
    onPlatform = true;
}

// =============================
// WEBSOCKET
// =============================
const ws = new WebSocket("ws://localhost:62024");

ws.onmessage = (event) => {
    let packet;
    try { 
        packet = JSON.parse(event.data); 
    } catch(e) { 
        return; 
    }

    const ev = packet.event;
    const data = packet.data || {};
    const user = data.nickname || data.uniqueId || "Anonim";
    const profileUrl = data.profilePictureUrl || "";

    // LIKE — 1 metru la fiecare 100 like-uri
    if (ev === "like") {
        globalLikeCounter++;

        if (globalLikeCounter >= 100) {
            globalLikeCounter = 0;
            spawnPlatform("like", profileUrl, user, 1);
        }
        return;
    }

    // CHAT — emoji = 1 metru
    if (ev === "chat") {
        const msg = data.comment || "";
        if (/[❤️😂🔥😍💥✨⭐]/.test(msg)) {
            spawnPlatform("emoji", profileUrl, user, 1);
        }
        return;
    }

    // GIFT — diamante = metri
    if (ev === "gift") {
        const d = data.diamondCount || 1;
        const type = d >= 20 ? "gift-big" : "gift-small";
        spawnPlatform(type, profileUrl, user, d);
        return;
    }
};

// =============================
// START
// =============================
resetGame();
gameLoop();
