const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  maxHttpBufferSize: 15e6
});

app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

const uploadsDir = path.join(__dirname, 'public/uploads');
const gamesDir = path.join(__dirname, 'games');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(gamesDir)) fs.mkdirSync(gamesDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${uuidv4().slice(0,8)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    cb(null, allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype));
  }
});

// In-memory game state
const activeGames = new Map();
const playerColors = ['#FF6B35', '#F7C531', '#E83F6F', '#2274A5', '#32936F', '#9B5DE5', '#00BBF9', '#00F5D4'];

function generatePuzzlePieces(gridSize) {
  const pieces = [];
  for (let row = 0; row < gridSize.rows; row++) {
    for (let col = 0; col < gridSize.cols; col++) {
      pieces.push({
        id: row * gridSize.cols + col,
        correctRow: row,
        correctCol: col,
        currentX: Math.random() * 800 + 900,
        currentY: Math.random() * 500 + 100,
        isPlaced: false,
        lockedBy: null
      });
    }
  }
  return pieces.sort(() => Math.random() - 0.5);
}

function saveGame(game) {
  const filePath = path.join(gamesDir, `${game.id}.json`);
  const saveData = { ...game, players: [] };
  fs.writeFileSync(filePath, JSON.stringify(saveData, null, 2));
}

function loadGame(gameId) {
  const filePath = path.join(gamesDir, `${gameId}.json`);
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }
  return null;
}

function calculateProgress(pieces) {
  const placed = pieces.filter(p => p.isPlaced).length;
  return Math.round((placed / pieces.length) * 100);
}

// API Routes
app.post('/api/games', upload.single('image'), (req, res) => {
  try {
    const gameId = uuidv4().slice(0, 8).toUpperCase();
    const { pieceCount = 100, gameName = 'Inferno Puzzle' } = req.body;
    
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

    const count = Math.min(250, Math.max(25, parseInt(pieceCount)));
    const aspectRatio = 4/3;
    const cols = Math.round(Math.sqrt(count * aspectRatio));
    const rows = Math.round(count / cols);
    
    const game = {
      id: gameId,
      name: gameName,
      imageUrl: `/uploads/${req.file.filename}`,
      gridSize: { cols, rows },
      totalPieces: cols * rows,
      pieces: generatePuzzlePieces({ cols, rows }),
      players: [],
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    };
    
    activeGames.set(gameId, game);
    saveGame(game);
    
    res.json({ gameId, totalPieces: game.totalPieces, gridSize: game.gridSize });
  } catch (err) {
    console.error('Create game error:', err);
    res.status(500).json({ error: 'Failed to create game' });
  }
});

app.get('/api/games/:gameId', (req, res) => {
  const gameId = req.params.gameId.toUpperCase();
  let game = activeGames.get(gameId) || loadGame(gameId);
  
  if (!game) return res.status(404).json({ error: 'Game not found' });
  
  if (!activeGames.has(gameId)) {
    game.players = [];
    activeGames.set(gameId, game);
  }
  
  res.json({
    id: game.id,
    name: game.name,
    imageUrl: game.imageUrl,
    gridSize: game.gridSize,
    totalPieces: game.totalPieces,
    pieces: game.pieces,
    players: game.players,
    progress: calculateProgress(game.pieces),
    createdAt: game.createdAt
  });
});

app.get('/api/games', (req, res) => {
  const games = [];
  const files = fs.readdirSync(gamesDir).filter(f => f.endsWith('.json'));
  
  for (const file of files.slice(-20)) {
    try {
      const game = JSON.parse(fs.readFileSync(path.join(gamesDir, file), 'utf8'));
      games.push({
        id: game.id,
        name: game.name,
        imageUrl: game.imageUrl,
        totalPieces: game.totalPieces,
        progress: calculateProgress(game.pieces),
        createdAt: game.createdAt
      });
    } catch (e) {}
  }
  
  res.json(games.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

app.post('/api/games/:gameId/image', upload.single('image'), (req, res) => {
  const gameId = req.params.gameId.toUpperCase();
  const game = activeGames.get(gameId);
  
  if (!game) return res.status(404).json({ error: 'Game not found' });
  if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
  
  // Delete old image
  const oldPath = path.join(__dirname, 'public', game.imageUrl);
  if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  
  game.imageUrl = `/uploads/${req.file.filename}`;
  game.pieces = generatePuzzlePieces(game.gridSize);
  game.lastActivity = new Date().toISOString();
  
  saveGame(game);
  io.to(gameId).emit('game:reset', { imageUrl: game.imageUrl, pieces: game.pieces });
  
  res.json({ success: true, imageUrl: game.imageUrl });
});

// Socket.IO
io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);
  
  socket.on('game:join', ({ gameId, playerName }) => {
    gameId = gameId.toUpperCase();
    const game = activeGames.get(gameId);
    if (!game) return socket.emit('error', { message: 'Game not found' });
    
    const existingPlayer = game.players.find(p => p.id === socket.id);
    if (!existingPlayer) {
      const player = {
        id: socket.id,
        name: playerName || `Player ${game.players.length + 1}`,
        color: playerColors[game.players.length % playerColors.length],
        joinedAt: new Date().toISOString()
      };
      game.players.push(player);
    }
    
    socket.join(gameId);
    socket.gameId = gameId;
    
    socket.emit('game:state', {
      id: game.id,
      name: game.name,
      imageUrl: game.imageUrl,
      gridSize: game.gridSize,
      totalPieces: game.totalPieces,
      pieces: game.pieces,
      players: game.players,
      progress: calculateProgress(game.pieces),
      yourId: socket.id
    });
    
    socket.to(gameId).emit('player:joined', game.players.find(p => p.id === socket.id));
    io.to(gameId).emit('players:update', game.players);
  });
  
  socket.on('piece:grab', ({ pieceId, groupId }) => {
    const game = activeGames.get(socket.gameId);
    if (!game) return;
    
    const piece = game.pieces.find(p => p.id === pieceId);
    if (piece && !piece.lockedBy && !piece.isPlaced) {
      piece.lockedBy = socket.id;
      socket.to(socket.gameId).emit('piece:grabbed', { pieceId, playerId: socket.id, groupId });
    }
  });
  
  socket.on('piece:move', ({ pieceId, x, y, groupId, groupPieces }) => {
    const game = activeGames.get(socket.gameId);
    if (!game) return;
    
    if (groupPieces) {
      groupPieces.forEach(gp => {
        const p = game.pieces.find(piece => piece.id === gp.id);
        if (p) { p.currentX = gp.x; p.currentY = gp.y; }
      });
      socket.to(socket.gameId).emit('piece:moved', { pieceId, x, y, playerId: socket.id, groupId, groupPieces });
    } else {
      const piece = game.pieces.find(p => p.id === pieceId);
      if (piece && piece.lockedBy === socket.id) {
        piece.currentX = x;
        piece.currentY = y;
        socket.to(socket.gameId).emit('piece:moved', { pieceId, x, y, playerId: socket.id });
      }
    }
  });
  
  socket.on('piece:release', ({ pieceId, x, y, placed, groupId, groupPieces, newGroup }) => {
    const game = activeGames.get(socket.gameId);
    if (!game) return;
    
    if (groupPieces) {
      groupPieces.forEach(gp => {
        const p = game.pieces.find(piece => piece.id === gp.id);
        if (p) {
          p.currentX = gp.x;
          p.currentY = gp.y;
          p.isPlaced = gp.placed;
          p.lockedBy = null;
        }
      });
    } else {
      const piece = game.pieces.find(p => p.id === pieceId);
      if (piece) {
        piece.currentX = x;
        piece.currentY = y;
        piece.isPlaced = placed;
        piece.lockedBy = null;
      }
    }
    
    if (newGroup) {
      if (!game.groups) game.groups = [];
      const existingIdx = game.groups.findIndex(g => 
        g.pieceIds.some(pid => newGroup.pieceIds.includes(pid))
      );
      if (existingIdx >= 0) {
        game.groups[existingIdx].pieceIds = newGroup.pieceIds;
      } else {
        game.groups.push(newGroup);
      }
    }
    
    game.lastActivity = new Date().toISOString();
    const progress = calculateProgress(game.pieces);
    
    io.to(socket.gameId).emit('piece:released', { 
      pieceId, x, y, placed, playerId: socket.id, progress, groupId, groupPieces, newGroup
    });
    
    if (progress === 100) {
      io.to(socket.gameId).emit('game:complete', { completedBy: game.players.map(p => p.name) });
    }
    
    if (Math.random() < 0.1) saveGame(game);
  });
  
  socket.on('cursor:move', ({ x, y }) => {
    socket.to(socket.gameId).emit('cursor:update', { playerId: socket.id, x, y });
  });
  
  socket.on('disconnect', () => {
    const game = activeGames.get(socket.gameId);
    if (game) {
      // Release any pieces locked by this player
      game.pieces.forEach(p => {
        if (p.lockedBy === socket.id) p.lockedBy = null;
      });
      
      game.players = game.players.filter(p => p.id !== socket.id);
      io.to(socket.gameId).emit('player:left', { playerId: socket.id });
      io.to(socket.gameId).emit('players:update', game.players);
      
      saveGame(game);
    }
    console.log('Player disconnected:', socket.id);
  });
});

// Auto-save all games every 30 seconds
setInterval(() => {
  activeGames.forEach(game => saveGame(game));
}, 30000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🔥 Inferno Puzzle server running on port ${PORT}`);
});
