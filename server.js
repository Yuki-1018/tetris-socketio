const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

let rooms = {};

io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('createRoom', (room) => {
    if (!rooms[room]) {
      rooms[room] = { players: [socket.id], gameInProgress: false };
      socket.join(room);
      socket.emit('roomCreated', room);
    } else {
      socket.emit('error', 'Room already exists');
    }
  });

  socket.on('joinRoom', (room) => {
    if (rooms[room] && rooms[room].players.length < 2) {
      rooms[room].players.push(socket.id);
      socket.join(room);
      socket.emit('roomJoined', room);
      io.in(room).emit('startGame', room);
    } else {
      socket.emit('error', 'Room is full or does not exist');
    }
  });

  socket.on('move', (data) => {
    socket.to(data.room).emit('move', data);
  });

  socket.on('gameOver', (room) => {
    io.in(room).emit('gameOver');
    rooms[room].gameInProgress = false;
  });

  socket.on('disconnect', () => {
    for (const room in rooms) {
      rooms[room].players = rooms[room].players.filter(id => id !== socket.id);
      if (rooms[room].players.length === 0) {
        delete rooms[room];
      } else {
        io.in(room).emit('opponentDisconnected');
      }
    }
    console.log('Client disconnected');
  });
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
