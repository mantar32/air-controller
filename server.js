const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Room management
const rooms = new Map();

// Generate 4-digit room code
function generateRoomCode() {
  let code;
  do {
    code = Math.floor(1000 + Math.random() * 9000).toString();
  } while (rooms.has(code));
  return code;
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Screen creates a new room
  socket.on('create-room', (callback) => {
    const roomCode = generateRoomCode();
    rooms.set(roomCode, {
      screenId: socket.id,
      players: [],
      gameState: null,
      currentGame: null
    });
    socket.join(roomCode);
    socket.roomCode = roomCode;
    socket.isScreen = true;
    console.log(`Room created: ${roomCode}`);
    callback({ success: true, roomCode });
  });
  
  // Controller joins a room
  socket.on('join-room', (data, callback) => {
    const { roomCode, playerName } = data;
    const room = rooms.get(roomCode);
    
    if (!room) {
      callback({ success: false, error: 'Room not found' });
      return;
    }
    
    if (room.players.length >= 8) {
      callback({ success: false, error: 'Room is full' });
      return;
    }
    
    const playerNumber = room.players.length + 1;
    const player = {
      id: socket.id,
      name: playerName || `Player ${playerNumber}`,
      number: playerNumber,
      color: getPlayerColor(playerNumber)
    };
    
    room.players.push(player);
    socket.join(roomCode);
    socket.roomCode = roomCode;
    socket.playerId = socket.id;
    socket.playerNumber = playerNumber;
    
    // Notify screen about new player
    io.to(room.screenId).emit('player-joined', player);
    
    callback({ success: true, player, currentGame: room.currentGame });
    console.log(`${player.name} joined room ${roomCode}`);
  });
  
  // Controller sends input
  socket.on('controller-input', (input) => {
    const room = rooms.get(socket.roomCode);
    if (room) {
      io.to(room.screenId).emit('controller-input', {
        playerId: socket.id,
        playerNumber: socket.playerNumber,
        ...input
      });
    }
  });
  
  // Screen starts a game
  socket.on('start-game', (gameId) => {
    const room = rooms.get(socket.roomCode);
    if (room && socket.isScreen) {
      room.currentGame = gameId;
      io.to(socket.roomCode).emit('game-started', gameId);
      console.log(`Game ${gameId} started in room ${socket.roomCode}`);
    }
  });
  
  // Screen sends game state to controllers
  socket.on('game-state', (state) => {
    const room = rooms.get(socket.roomCode);
    if (room && socket.isScreen) {
      socket.to(socket.roomCode).emit('game-state', state);
    }
  });
  
  // Screen ends game
  socket.on('end-game', () => {
    const room = rooms.get(socket.roomCode);
    if (room && socket.isScreen) {
      room.currentGame = null;
      io.to(socket.roomCode).emit('game-ended');
    }
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    if (socket.roomCode) {
      const room = rooms.get(socket.roomCode);
      if (room) {
        if (socket.isScreen) {
          // Screen disconnected, close the room
          io.to(socket.roomCode).emit('room-closed');
          rooms.delete(socket.roomCode);
          console.log(`Room ${socket.roomCode} closed`);
        } else {
          // Player disconnected
          room.players = room.players.filter(p => p.id !== socket.id);
          io.to(room.screenId).emit('player-left', { playerId: socket.id });
        }
      }
    }
  });
});

// Player colors
function getPlayerColor(number) {
  const colors = [
    '#FF6B6B', // Red
    '#4ECDC4', // Teal
    '#FFE66D', // Yellow
    '#95E1D3', // Mint
    '#F38181', // Coral
    '#AA96DA', // Purple
    '#FCBAD3', // Pink
    '#A8D8EA'  // Light Blue
  ];
  return colors[(number - 1) % colors.length];
}

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/controller', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'controller.html'));
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════╗
║                  AIR CONTROLLER                    ║
╠════════════════════════════════════════════════════╣
║  Server running at http://localhost:${PORT}           ║
║                                                    ║
║  TV/PC  → http://localhost:${PORT}                    ║
║  Phone  → http://localhost:${PORT}/controller         ║
╚════════════════════════════════════════════════════╝
  `);
});
