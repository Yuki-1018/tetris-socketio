const socket = io();
let room = '';

document.getElementById('createRoomButton').addEventListener('click', () => {
  room = document.getElementById('roomInput').value;
  socket.emit('createRoom', room);
  document.getElementById('waiting').style.display = 'block';
});

document.getElementById('joinRoomButton').addEventListener('click', () => {
  room = document.getElementById('roomInput').value;
  socket.emit('joinRoom', room);
});

socket.on('roomCreated', (room) => {
  console.log(`Room ${room} created`);
  document.getElementById('menu').style.display = 'none';
  document.getElementById('waiting').style.display = 'block';
});

socket.on('roomJoined', (room) => {
  console.log(`Joined room ${room}`);
  document.getElementById('menu').style.display = 'none';
  document.getElementById('waiting').style.display = 'none';
  document.getElementById('game').style.display = 'block';
  startGame();
});

socket.on('startGame', (room) => {
  document.getElementById('menu').style.display = 'none';
  document.getElementById('waiting').style.display = 'none';
  document.getElementById('game').style.display = 'block';
  startGame();
});

socket.on('move', (data) => {
  updateOpponentCanvas(data);
});

socket.on('gameOver', () => {
  document.getElementById('gameOver').style.display = 'block';
  setTimeout(() => {
    document.getElementById('gameOver').style.display = 'none';
    startGame();
  }, 3000);
});

socket.on('error', (message) => {
  alert(message);
});

socket.on('opponentDisconnected', () => {
  alert('Opponent disconnected. Waiting for a new opponent...');
  document.getElementById('game').style.display = 'none';
  document.getElementById('menu').style.display = 'block';
});

function startGame() {
  initTetris();
}

function updateOpponentCanvas(data) {
  // Update opponent's canvas with data from their moves
  const opponentCanvas = document.getElementById('opponentCanvas');
  const opponentCtx = opponentCanvas.getContext('2d');
  opponentCtx.clearRect(0, 0, opponentCanvas.width, opponentCanvas.height);
  // Render the opponent's moves based on the data received
  drawBoard(opponentCtx, data.board);
  drawTetromino(opponentCtx, data.tetromino);
}

function initTetris() {
  const canvas = document.getElementById('tetrisCanvas');
  const ctx = canvas.getContext('2d');

  const opponentCanvas = document.getElementById('opponentCanvas');
  const opponentCtx = opponentCanvas.getContext('2d');

  const columns = 10;
  const rows = 20;
  const scale = 30;

  let board = createBoard(rows, columns);
  let player = createPlayer();

  document.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') {
      player.pos.x--;
      if (collide(board, player)) {
        player.pos.x++;
      }
    } else if (event.key === 'ArrowRight') {
      player.pos.x++;
      if (collide(board, player)) {
        player.pos.x--;
      }
    } else if (event.key === 'ArrowDown') {
      playerDrop();
    } else if (event.key === 'ArrowUp') {
      rotate(player, board);
    }
    socket.emit('move', { room, board, tetromino: player });
  });

  function playerDrop() {
    player.pos.y++;
    if (collide(board, player)) {
      player.pos.y--;
      merge(board, player);
      resetPlayer();
      if (collide(board, player)) {
        board.forEach(row => row.fill(0));
        socket.emit('gameOver', room);
      }
    }
    dropCounter = 0;
  }

  function createBoard(rows, columns) {
    const board = [];
    for (let row = 0; row < rows; row++) {
      board.push(new Array(columns).fill(0));
    }
    return board;
  }

  function createPlayer() {
    const tetrominoes = 'TJLOSZI';
    const tetromino = createTetromino(tetrominoes[(tetrominoes.length * Math.random()) | 0]);
    return {
      pos: { x: (columns / 2 | 0) - (tetromino[0].length / 2 | 0), y: 0 },
      tetromino
    };
  }

  function createTetromino(type) {
    if (type === 'T') {
      return [
        [0, 0, 0],
        [1, 1, 1],
        [0, 1, 0],
      ];
    } else if (type === 'O') {
      return [
        [2, 2],
        [2, 2],
      ];
    } else if (type === 'L') {
      return [
        [0, 3, 0],
        [0, 3, 0],
        [0, 3, 3],
      ];
    } else if (type === 'J') {
      return [
        [0, 4, 0],
        [0, 4, 0],
        [4, 4, 0],
      ];
    } else if (type === 'I') {
      return [
        [0, 5, 0, 0],
        [0, 5, 0, 0],
        [0, 5, 0, 0],
        [0, 5, 0, 0],
      ];
    } else if (type === 'S') {
      return [
        [0, 6, 6],
        [6, 6, 0],
        [0, 0, 0],
      ];
    } else if (type === 'Z') {
      return [
        [7, 7, 0],
        [0, 7, 7],
        [0, 0, 0],
      ];
    }
  }

  function drawBoard(ctx, board) {
    board.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value !== 0) {
          ctx.fillStyle = colors[value];
          ctx.fillRect(x * scale, y * scale, scale, scale);
        }
      });
    });
  }

  function drawTetromino(ctx, player) {
    player.tetromino.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value !== 0) {
          ctx.fillStyle = colors[value];
          ctx.fillRect((x + player.pos.x) * scale, (y + player.pos.y) * scale, scale, scale);
        }
      });
    });
  }

  function merge(board, player) {
    player.tetromino.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value !== 0) {
          board[y + player.pos.y][x + player.pos.x] = value;
        }
      });
    });
  }

  function collide(board, player) {
    const [m, o] = [player.tetromino, player.pos];
    for (let y = 0; y < m.length; y++) {
      for (let x = 0; x < m[y].length; x++) {
        if (m[y][x] !== 0 &&
          (board[y + o.y] &&
            board[y + o.y][x + o.x]) !== 0) {
          return true;
        }
      }
    }
    return false;
  }

  function rotate(player, board) {
    const pos = player.pos.x;
    let offset = 1;
    rotateMatrix(player.tetromino);
    while (collide(board, player)) {
      player.pos.x += offset;
      offset = -(offset + (offset > 0 ? 1 : -1));
      if (offset > player.tetromino[0].length) {
        rotateMatrix(player.tetromino, true);
        player.pos.x = pos;
        return;
      }
    }
  }

  function rotateMatrix(matrix, reverse) {
    for (let y = 0; y < matrix.length; y++) {
      for (let x = 0; x < y; x++) {
        [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
      }
    }
    if (reverse) {
      matrix.forEach(row => row.reverse());
    } else {
      matrix.reverse();
    }
  }

  function resetPlayer() {
    const pieces = 'TJLOSZI';
    player.tetromino = createTetromino(pieces[(pieces.length * Math.random()) | 0]);
    player.pos.y = 0;
    player.pos.x = (board[0].length / 2 | 0) - (player.tetromino[0].length / 2 | 0);
  }

  const colors = [
    null,
    'cyan',
    'blue',
    'orange',
    'yellow',
    'green',
    'purple',
    'red'
  ];

  let dropCounter = 0;
  let dropInterval = 1000;
  let lastTime = 0;

  function update(time = 0) {
    const deltaTime = time - lastTime;
    lastTime = time;

    dropCounter += deltaTime;
    if (dropCounter > dropInterval) {
      playerDrop();
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBoard(ctx, board);
    drawTetromino(ctx, player);

    requestAnimationFrame(update);
  }

  resetPlayer();
  update();
}
