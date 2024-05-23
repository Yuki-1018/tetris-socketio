// /api/game.js

const { Server } = require('socket.io');
let io;

const rooms = {};

function createPlayer(id) {
    return { id, x: 400, y: 300, angle: 0, strength: 300, lives: 3, inGame: true };
}

function createBullet(player) {
    return { x: player.x, y: player.y, angle: player.angle, speed: 5, playerId: player.id };
}

function generateRoomId() {
    return Math.random().toString(36).substring(2, 9);
}

function getRoomId(socket) {
    return Array.from(socket.rooms).find((roomId) => roomId !== socket.id);
}

function gameLoop() {
    for (const roomId in rooms) {
        const room = rooms[roomId];
        updateBullets(room);
        spawnEnemies(room);
        updateEnemies(room);
        detectCollisions(room);
        io.in(roomId).emit('updateState', room);
    }
}

function updateBullets(room) {
    room.bullets.forEach((bullet) => {
        bullet.x += bullet.speed * Math.cos(bullet.angle);
        bullet.y += bullet.speed * Math.sin(bullet.angle);
    });
    room.bullets = room.bullets.filter(bullet => bullet.x >= 0 && bullet.x <= 800 && bullet.y >= 0 && bullet.y <= 600);
}

function spawnEnemies(room) {
    if (Math.random() < 0.01) {
        room.enemies.push({ x: Math.random() * 800, y: 0, speed: 1, health: 50 });
    }
}

function updateEnemies(room) {
    room.enemies.forEach((enemy) => {
        enemy.y += enemy.speed;
    });
    room.enemies = room.enemies.filter(enemy => enemy.y <= 600);
}

function detectCollisions(room) {
    room.bullets.forEach((bullet, bIndex) => {
        room.enemies.forEach((enemy, eIndex) => {
            if (Math.hypot(bullet.x - enemy.x, bullet.y - enemy.y) < 10) {
                room.enemies.splice(eIndex, 1);
                room.bullets.splice(bIndex, 1);
            }
        });
    });

    for (const playerId in room.players) {
        const player = room.players[playerId];
        room.enemies.forEach((enemy, eIndex) => {
            if (Math.hypot(player.x - enemy.x, player.y - enemy.y) < 20) {
                handlePlayerHit(player, room);
                room.enemies.splice(eIndex, 1);
            }
        });
    }
}

function handlePlayerHit(player, room) {
    player.strength -= 15;
    if (player.strength <= 0) {
        player.lives -= 1;
        if (player.lives > 0) {
            player.strength = 300; // reset strength if lives are left
        } else {
            player.inGame = false; // player can only watch the game
        }
    }
}

module.exports = (req, res) => {
    if (!io) {
        io = new Server(res.socket.server);
        res.socket.server.io = io;

        io.on('connection', (socket) => {
            console.log('New player connected:', socket.id);

            socket.on('createRoom', () => {
                const roomId = generateRoomId();
                rooms[roomId] = { players: {}, enemies: [], bullets: [] };
                socket.join(roomId);
                rooms[roomId].players[socket.id] = createPlayer(socket.id);
                socket.emit('roomCreated', roomId);
                console.log(`Room created: ${roomId}`);
            });

            socket.on('joinRoom', (roomId) => {
                if (rooms[roomId] && Object.keys(rooms[roomId].players).length < 4) {
                    socket.join(roomId);
                    rooms[roomId].players[socket.id] = createPlayer(socket.id);
                    socket.emit('roomJoined', roomId);
                    io.in(roomId).emit('updateState', rooms[roomId]);
                    console.log(`Player ${socket.id} joined room: ${roomId}`);
                } else {
                    socket.emit('roomFull');
                }
            });

            socket.on('playerMove', (data) => {
                const roomId = getRoomId(socket);
                if (roomId && rooms[roomId] && rooms[roomId].players[socket.id]) {
                    Object.assign(rooms[roomId].players[socket.id], data);
                    io.in(roomId).emit('updateState', rooms[roomId]);
                }
            });

            socket.on('shoot', () => {
                const roomId = getRoomId(socket);
                if (roomId && rooms[roomId] && rooms[roomId].players[socket.id]) {
                    const player = rooms[roomId].players[socket.id];
                    const bullet = createBullet(player);
                    rooms[roomId].bullets.push(bullet);
                    io.in(roomId).emit('updateState', rooms[roomId]);
                }
            });

            socket.on('disconnect', () => {
                const roomId = getRoomId(socket);
                if (roomId && rooms[roomId]) {
                    delete rooms[roomId].players[socket.id];
                    if (Object.keys(rooms[roomId].players).length === 0) {
                        delete rooms[roomId];
                        console.log(`Room ${roomId} deleted`);
                    }
                    io.in(roomId).emit('updateState', rooms[roomId]);
                }
                console.log('Player disconnected:', socket.id);
            });
        });

        setInterval(gameLoop, 1000 / 60);
    }
    res.end();
};
