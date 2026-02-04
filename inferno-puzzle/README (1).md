# 🔥 Inferno Puzzle

A real-time collaborative puzzle game with a fire/dark theme. Work together with friends to solve 100-1000 piece puzzles!

![Inferno Puzzle](https://img.shields.io/badge/Node.js-18+-green) ![Socket.IO](https://img.shields.io/badge/Socket.IO-4.7-blue) ![License](https://img.shields.io/badge/License-MIT-orange)

## ✨ Features

- **100-1000 Piece Puzzles**: Choose your difficulty level
- **Real-time Multiplayer**: See your friends' cursors and piece movements instantly
- **Upload Any Image**: Turn any picture into a puzzle
- **Update Image**: Change the puzzle image mid-game (resets progress)
- **Save & Load Games**: Continue puzzles later with unique game codes
- **Fire-themed Dark UI**: Beautiful ember particles and glowing effects
- **Pan & Zoom**: Navigate large puzzles easily
- **Mobile Support**: Touch-friendly controls
- **Progress Tracking**: See completion percentage in real-time
- **Player Colors**: Each player has a unique color indicator

## 🚀 Quick Start

### Local Development

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/inferno-puzzle.git
cd inferno-puzzle

# Install dependencies
npm install

# Start the server
npm start

# Open http://localhost:3000 in your browser
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |

## 📦 Deploying to Render (Free Tier)

### Step 1: Push to GitHub

```bash
# Initialize git (if not already)
git init
git add .
git commit -m "Initial commit"

# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/inferno-puzzle.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy on Render

1. Go to [render.com](https://render.com) and sign up/login
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub account and select the `inferno-puzzle` repository
4. Configure the service:

| Setting | Value |
|---------|-------|
| **Name** | `inferno-puzzle` (or your choice) |
| **Region** | Choose closest to you |
| **Branch** | `main` |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Instance Type** | `Free` |

5. Click **"Create Web Service"**
6. Wait for deployment (2-3 minutes)
7. Your app will be live at `https://inferno-puzzle.onrender.com`

### ⚠️ Free Tier Limitations

- Server sleeps after 15 minutes of inactivity
- First request after sleep takes ~30 seconds to wake up
- 750 hours/month free (enough for one service 24/7)
- Game data persists only while server is running

### Pro Tips for Render Free Tier

1. **Keep it awake**: Use [UptimeRobot](https://uptimerobot.com) to ping your URL every 14 minutes
2. **Data persistence**: Game saves are stored in `/games` folder - they persist between deploys but not between sleep cycles on free tier

## 🎮 How to Play

### Creating a New Game

1. Click **"New Game"** on the main menu
2. Enter your name
3. Upload an image (any JPG, PNG, GIF, or WebP)
4. Adjust the piece count slider (100-1000)
5. Click **"Create Puzzle"**

### Joining a Game

1. Get the 8-character game code from a friend
2. Enter it in the code box on the main menu
3. Click **"Join"** and enter your name

### Playing

- **Drag pieces** to move them
- **Scroll wheel** or zoom buttons to zoom in/out
- **Click and drag background** to pan around
- Pieces **snap into place** when close to correct position
- Watch the **progress bar** to track completion
- See **other players' cursors** in real-time

### Sharing

- Click **"Share Code"** to copy the game code
- Or share: `https://your-app.onrender.com?game=GAMECODE`

## 🛠️ Tech Stack

- **Backend**: Node.js + Express
- **Real-time**: Socket.IO
- **Storage**: File-based JSON (games folder)
- **Frontend**: Vanilla JavaScript + CSS
- **Fonts**: Cinzel (titles) + Rajdhani (UI)

## 📁 Project Structure

```
inferno-puzzle/
├── server.js           # Main server with Socket.IO
├── package.json        # Dependencies
├── public/
│   ├── index.html      # Full frontend app
│   └── uploads/        # Uploaded images
├── games/              # Saved game JSON files
└── README.md
```

## 🔧 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/games` | Create new game (multipart form) |
| `GET` | `/api/games` | List saved games |
| `GET` | `/api/games/:id` | Get game state |
| `POST` | `/api/games/:id/image` | Update game image |

## 🔌 Socket Events

### Client → Server

| Event | Data | Description |
|-------|------|-------------|
| `game:join` | `{gameId, playerName}` | Join a game room |
| `piece:grab` | `{pieceId}` | Lock a piece for dragging |
| `piece:move` | `{pieceId, x, y}` | Broadcast piece position |
| `piece:release` | `{pieceId, x, y, placed}` | Release piece |
| `cursor:move` | `{x, y}` | Broadcast cursor position |

### Server → Client

| Event | Data | Description |
|-------|------|-------------|
| `game:state` | Full game object | Initial game state |
| `player:joined` | Player object | New player notification |
| `player:left` | `{playerId}` | Player disconnect |
| `piece:grabbed` | `{pieceId, playerId}` | Piece locked |
| `piece:moved` | `{pieceId, x, y, playerId}` | Piece position update |
| `piece:released` | `{pieceId, x, y, placed, progress}` | Piece released |
| `game:complete` | `{}` | Puzzle completed |
| `game:reset` | `{imageUrl, pieces}` | Image updated |

## 🎨 Customization

### Change Colors

Edit the CSS variables in `public/index.html`:

```css
:root {
  --fire-orange: #FF6B35;
  --fire-yellow: #F7C531;
  --fire-red: #E83F6F;
  --ember: #FF4500;
  --coal: #1a1a1a;
  --ash: #2d2d2d;
  --smoke: #3d3d3d;
}
```

### Adjust Puzzle Board Size

Edit `renderPuzzle()` in the JavaScript:

```javascript
puzzleBoard.style.width = '800px';  // Change width
puzzleBoard.style.height = '600px'; // Change height
```

## 📄 License

MIT License - feel free to use for any purpose!

## 🤝 Contributing

Pull requests welcome! For major changes, please open an issue first.

---

Made with 🔥 by your friendly puzzle enthusiasts
