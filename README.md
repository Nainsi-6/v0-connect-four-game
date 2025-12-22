# 4 in a Row - Connect Four Game

A professional real-time multiplayer Connect Four game built with Node.js, Socket.io, React, and Next.js.

## Features

- **Real-time Multiplayer**: Play against other players using WebSockets
- **Competitive AI Bot**: Smart bot opponent with strategic decision-making
- **Matchmaking System**: 10-second wait for players, then auto-match with bot
- **Reconnection Support**: Rejoin games within 30 seconds if disconnected
- **Persistent Leaderboard**: PostgreSQL-backed player statistics
- **Analytics**: Kafka integration for game event tracking
- **Modern UI**: Beautiful, responsive design with Tailwind CSS

## Tech Stack

### Backend
- **Node.js** with TypeScript
- **Express** for REST API
- **Socket.io** for real-time communication
- **PostgreSQL** for data persistence
- **Kafka** for analytics events

### Frontend
- **Next.js 16** with App Router
- **React 19** with TypeScript
- **Tailwind CSS v4** for styling
- **Socket.io Client** for real-time updates

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- Kafka (optional, for analytics)

### Environment Variables

Create `.env` files in both root and server directories:

**Root `.env`:**
```env
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
NEXT_PUBLIC_API_URL=http://localhost:3001
```

**Server `.env`:**
```env
PORT=3001
CLIENT_URL=http://localhost:3000
DATABASE_URL=postgresql://user:password@localhost:5432/connectfour
KAFKA_BROKER=localhost:9092
```

### Installation

1. **Install dependencies:**
```bash
# Install frontend dependencies
npm install

# Install server dependencies
cd server
npm install
```

2. **Setup Database:**
Run the SQL script to initialize tables:
```bash
psql -d connectfour -f scripts/01-init-database.sql
```

3. **Start the servers:**

```bash
# Terminal 1: Start backend
cd server
npm run dev

# Terminal 2: Start frontend
npm run dev

# Terminal 3 (Optional): Start Kafka consumer
cd server
npx tsx kafka-consumer.ts
```

4. **Open the game:**
Navigate to `http://localhost:3000`

## Game Architecture

### Backend Structure

- **game-logic.ts**: Core game rules, win detection, and bot AI
- **database.ts**: PostgreSQL operations for games and leaderboard
- **kafka-producer.ts**: Event publishing for analytics
- **kafka-consumer.ts**: Analytics service (separate process)
- **index.ts**: Main server with Socket.io matchmaking

### Bot Strategy

The bot uses a heuristic approach:
1. **Win**: If bot can win in one move, take it
2. **Block**: If opponent can win in one move, block it
3. **Strategic**: Prefer center columns for maximum opportunities

### Matchmaking Flow

1. Player joins → Added to waiting queue
2. 10-second countdown starts
3. If another player joins → Start 1v1 game
4. If timeout → Start game with bot

## Deployment

### Docker Deployment

```bash
# Build and run with docker-compose
docker-compose up --build
```

### Vercel Deployment

1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables
4. Deploy server separately (Railway, Render, etc.)

## API Endpoints

- `GET /api/leaderboard` - Fetch top 10 players
- `GET /health` - Health check endpoint

## Socket.io Events

### Client → Server
- `joinGame` - Join matchmaking queue
- `makeMove` - Make a move (column selection)

### Server → Client
- `waiting` - Matchmaking in progress
- `countdown` - Seconds until bot joins
- `gameStart` - Game begins
- `gameUpdate` - Board state update
- `gameOver` - Game finished
- `opponentDisconnected` - Opponent left
- `error` - Error message

## Project Structure

```
├── app/                    # Next.js app directory
│   ├── page.tsx           # Main game page
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── game-board.tsx    # Game board UI
│   └── leaderboard.tsx   # Leaderboard display
├── server/               # Backend server
│   ├── index.ts          # Main server
│   ├── game-logic.ts     # Game rules & bot
│   ├── database.ts       # Database operations
│   ├── kafka-producer.ts # Event publishing
│   └── kafka-consumer.ts # Analytics service
└── scripts/              # Database scripts
    └── 01-init-database.sql
```

## Performance Optimizations

- Efficient win detection (only checks from last move)
- In-memory game state for low latency
- PostgreSQL indexes on leaderboard queries
- WebSocket connection for real-time updates

## Security Considerations

- Input validation on all moves
- Column full detection
- Turn validation (prevent out-of-turn moves)
- SQL injection prevention with parameterized queries

## Future Enhancements

- [ ] Ranked matchmaking with ELO system
- [ ] Game replay functionality
- [ ] Tournament mode
- [ ] Chat system
- [ ] Mobile app version
- [ ] Multiple difficulty levels for bot

## License

MIT

## Support

For issues or questions, please open a GitHub issue.

---

Built with ❤️ using Next.js, Node.js, and Socket.io
