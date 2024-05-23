// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(express.static('public'));

const rooms = {};

io.on('connection', (socket) => {
  socket.on('createOrJoin', (room) => {
    if (!rooms[room]) {
      rooms[room] = [];
    }
    if (rooms[room].length < 2) {
      rooms[room].push(socket.id);
      socket.join(room);
      socket.emit('joined', room);
      if (rooms[room].length === 2) {
        io.to(room).emit('countdown', 3);
        setTimeout(() => io.to(room).emit('countdown', 2), 1000);
        setTimeout(() => io.to(room).emit('countdown', 1), 2000);
        setTimeout(() => io.to(room).emit('startGame'), 3000);
      }
    } else {
      socket.emit('roomFull', room);
    }
  });

  socket.on('playerMove', (data) => {
    const room = Array.from(socket.rooms).filter(r => r !== socket.id)[0];
    if (room) {
      socket.to(room).emit('opponentMove', data);
    }
  });

  socket.on('gameOver', () => {
    const room = Array.from(socket.rooms).filter(r => r !== socket.id)[0];
    if (room) {
      io.to(room).emit('newRound');
    }
  });

  socket.on('disconnect', () => {
    for (const room in rooms) {
      rooms[room] = rooms[room].filter(id => id !== socket.id);
      if (rooms[room].length === 0) {
        delete rooms[room];
      } else {
        io.to(room).emit('opponentDisconnected');
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
