const socket = io();
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const players = {};
const bullets = [];
const enemies = [];

function createRoom() {
    socket.emit('createRoom');
}

function joinRoom() {
    const roomId = prompt('Enter room ID:');
    if (roomId) {
        socket.emit('joinRoom', roomId);
    }
}

socket.on('roomCreated', (roomId) => {
    alert(`Room created with ID: ${roomId}`);
});

socket.on('roomJoined', (roomId) => {
    alert(`Joined room: ${roomId}`);
});

socket.on('updateState', (state) => {
    Object.assign(players, state.players);
    bullets.length = 0;
    bullets.push(...state.bullets);
    enemies.length = 0;
    enemies.push(...state.enemies);
    draw();
});

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawPlayers();
    drawBullets();
    drawEnemies();
}

function drawPlayers() {
    for (const id in players) {
        const player = players[id];
        ctx.fillStyle = player.inGame ? 'blue' : 'gray';
        ctx.fillRect(player.x - 10, player.y - 10, 20, 20);
        ctx.fillText(`Lives: ${player.lives}`, player.x - 10, player.y - 20);
        ctx.fillText(`Strength: ${player.strength}`, player.x - 10, player.y - 30);
    }
}

function drawBullets() {
    bullets.forEach((bullet) => {
        ctx.fillStyle = 'red';
        ctx.fillRect(bullet.x - 2, bullet.y - 2, 4, 4);
    });
}

function drawEnemies() {
    enemies.forEach((enemy) => {
        ctx.fillStyle = 'green';
        ctx.fillRect(enemy.x - 10, enemy.y - 10, 20, 20);
    });
}

function movePlayer(direction) {
    const player = players[socket.id];
    if (player && player.inGame) {
        if (direction === 'up') player.y -= 5;
        if (direction === 'down') player.y += 5;
        if (direction === 'left') player.x -= 5;
        if (direction === 'right') player.x += 5;
        socket.emit('playerMove', player);
        draw();
    }
}

function shoot() {
    const player = players[socket.id];
    if (player && player.inGame) {
        socket.emit('shoot');
    }
}

document.getElementById('up').addEventListener('click', () => movePlayer('up'));
document.getElementById('down').addEventListener('click', () => movePlayer('down'));
document.getElementById('left').addEventListener('click', () => movePlayer('left'));
document.getElementById('right').addEventListener('click', () => movePlayer('right'));
document.getElementById('shoot').addEventListener('click', shoot);

window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') movePlayer('up');
    if (e.key === 'ArrowDown') movePlayer('down');
    if (e.key === 'ArrowLeft') movePlayer('left');
    if (e.key === 'ArrowRight') movePlayer('right');
    if (e.key === ' ') shoot();
});
