import express from "express"
import { createServer } from "http"
import { Server, type Socket } from "socket.io"
import cors from "cors"
import { GameLogic, type Player, type Board } from "./game-logic"
import { initDatabase, saveGame, getLeaderboard } from "./database"
import { initKafka, sendGameEvent } from "./kafka-producer"

const app = express()
app.use(cors())
app.use(express.json())

const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
})

interface GameRoom {
  id: string
  player1: { socket: Socket; username: string }
  player2: { socket: Socket; username: string } | null
  board: Board
  currentPlayer: Player
  isBot: boolean
  movesCount: number
  startTime: Date
}

const waitingPlayers: Map<string, { socket: Socket; username: string; timeout: NodeJS.Timeout }> = new Map()
const activeGames: Map<string, GameRoom> = new Map()
const playerToGame: Map<string, string> = new Map()

const MATCHMAKING_TIMEOUT = 10000 // 10 seconds

async function startGameWithBot(player: { socket: Socket; username: string }) {
  const gameId = `game-${Date.now()}-${Math.random()}`
  const game: GameRoom = {
    id: gameId,
    player1: player,
    player2: null,
    board: GameLogic.createEmptyBoard(),
    currentPlayer: 1,
    isBot: true,
    movesCount: 0,
    startTime: new Date(),
  }

  activeGames.set(gameId, game)
  playerToGame.set(player.socket.id, gameId)

  player.socket.emit("gameStart", {
    board: game.board,
    currentPlayer: game.currentPlayer,
    yourPlayer: 1,
    opponentName: "Bot",
    isBot: true,
    gameId,
  })

  await sendGameEvent({
    type: "GAME_START",
    gameId,
    player1: player.username,
    player2: "Bot",
    isBot: true,
    timestamp: new Date(),
  })
}

function makeBotMove(gameId: string) {
  const game = activeGames.get(gameId)
  if (!game || !game.isBot || game.currentPlayer !== 2) return

  setTimeout(() => {
    const botColumn = GameLogic.findBestMove(game.board, 2)
    const newBoard = GameLogic.dropDisc(game.board, botColumn, 2)

    if (!newBoard) return

    game.board = newBoard
    game.movesCount++
    const row = GameLogic.getLowestEmptyRow(game.board, botColumn)

    const isWin = GameLogic.checkWin(game.board, row + 1, botColumn)
    const isDraw = GameLogic.isDraw(game.board)

    if (isWin || isDraw) {
      endGame(game, isWin ? 2 : null, isDraw)
    } else {
      game.currentPlayer = 1
      game.player1.socket.emit("gameUpdate", {
        board: game.board,
        currentPlayer: game.currentPlayer,
        yourPlayer: 1,
        opponentName: "Bot",
        isBot: true,
      })
    }
  }, 500) // Bot thinks for 500ms
}

async function endGame(game: GameRoom, winner: Player | null, isDraw: boolean) {
  const durationSeconds = Math.floor((Date.now() - game.startTime.getTime()) / 1000)

  const gameData = {
    player1: game.player1.username,
    player2: game.player2?.username || "Bot",
    winner: winner ? (winner === 1 ? game.player1.username : game.player2?.username || "Bot") : null,
    isDraw,
    isBotGame: game.isBot,
    movesCount: game.movesCount,
    durationSeconds,
  }

  await saveGame(gameData)
  await sendGameEvent({
    type: "GAME_END",
    gameId: game.id,
    player1: game.player1.username,
    player2: game.player2?.username || "Bot",
    isBot: game.isBot,
    winner: gameData.winner || undefined,
    isDraw,
    movesCount: game.movesCount,
    durationSeconds,
    timestamp: new Date(),
  })

  game.player1.socket.emit("gameOver", {
    board: game.board,
    yourPlayer: 1,
    winner,
    isDraw,
    opponentName: game.player2?.username || "Bot",
    isBot: game.isBot,
  })

  if (game.player2) {
    game.player2.socket.emit("gameOver", {
      board: game.board,
      yourPlayer: 2,
      winner,
      isDraw,
      opponentName: game.player1.username,
      isBot: false,
    })
  }

  // Cleanup
  activeGames.delete(game.id)
  playerToGame.delete(game.player1.socket.id)
  if (game.player2) {
    playerToGame.delete(game.player2.socket.id)
  }
}

io.on("connection", (socket: Socket) => {
  console.log("[v0] Client connected:", socket.id)

  socket.on("joinGame", ({ username }: { username: string }) => {
    // Check if there's a waiting player
    const waitingPlayerEntry = Array.from(waitingPlayers.values())[0]

    if (waitingPlayerEntry && waitingPlayerEntry.socket.id !== socket.id) {
      // Match found! Start game
      const player1 = waitingPlayerEntry
      const player2 = { socket, username }

      clearTimeout(player1.timeout)
      waitingPlayers.delete(player1.socket.id)

      const gameId = `game-${Date.now()}-${Math.random()}`
      const game: GameRoom = {
        id: gameId,
        player1,
        player2,
        board: GameLogic.createEmptyBoard(),
        currentPlayer: 1,
        isBot: false,
        movesCount: 0,
        startTime: new Date(),
      }

      activeGames.set(gameId, game)
      playerToGame.set(player1.socket.id, gameId)
      playerToGame.set(player2.socket.id, gameId)

      player1.socket.emit("gameStart", {
        board: game.board,
        currentPlayer: game.currentPlayer,
        yourPlayer: 1,
        opponentName: player2.username,
        isBot: false,
        gameId,
      })

      player2.socket.emit("gameStart", {
        board: game.board,
        currentPlayer: game.currentPlayer,
        yourPlayer: 2,
        opponentName: player1.username,
        isBot: false,
        gameId,
      })

      sendGameEvent({
        type: "GAME_START",
        gameId,
        player1: player1.username,
        player2: player2.username,
        isBot: false,
        timestamp: new Date(),
      })
    } else {
      // No match, start waiting
      const player = { socket, username }

      socket.emit("waiting", { countdown: MATCHMAKING_TIMEOUT / 1000 })

      let countdown = MATCHMAKING_TIMEOUT / 1000
      const countdownInterval = setInterval(() => {
        countdown--
        if (countdown > 0) {
          socket.emit("countdown", countdown)
        } else {
          clearInterval(countdownInterval)
        }
      }, 1000)

      const timeout = setTimeout(() => {
        clearInterval(countdownInterval)
        if (waitingPlayers.has(socket.id)) {
          waitingPlayers.delete(socket.id)
          startGameWithBot(player)
        }
      }, MATCHMAKING_TIMEOUT)

      waitingPlayers.set(socket.id, { socket, username, timeout })
    }
  })

  socket.on("makeMove", ({ column }: { column: number }) => {
    const gameId = playerToGame.get(socket.id)
    if (!gameId) return

    const game = activeGames.get(gameId)
    if (!game) return

    const yourPlayer = game.player1.socket.id === socket.id ? 1 : 2
    if (game.currentPlayer !== yourPlayer) {
      socket.emit("error", "Not your turn")
      return
    }

    const newBoard = GameLogic.dropDisc(game.board, column, yourPlayer)
    if (!newBoard) {
      socket.emit("error", "Column is full")
      return
    }

    game.board = newBoard
    game.movesCount++
    const row = GameLogic.getLowestEmptyRow(game.board, column)

    const isWin = GameLogic.checkWin(game.board, row + 1, column)
    const isDraw = GameLogic.isDraw(game.board)

    if (isWin || isDraw) {
      endGame(game, isWin ? yourPlayer : null, isDraw)
    } else {
      game.currentPlayer = game.currentPlayer === 1 ? 2 : 1

      game.player1.socket.emit("gameUpdate", {
        board: game.board,
        currentPlayer: game.currentPlayer,
        yourPlayer: 1,
        opponentName: game.player2?.username || "Bot",
        isBot: game.isBot,
      })

      if (game.player2) {
        game.player2.socket.emit("gameUpdate", {
          board: game.board,
          currentPlayer: game.currentPlayer,
          yourPlayer: 2,
          opponentName: game.player1.username,
          isBot: false,
        })
      }

      // If bot's turn, make bot move
      if (game.isBot && game.currentPlayer === 2) {
        makeBotMove(gameId)
      }
    }
  })

  socket.on("disconnect", () => {
    console.log("[v0] Client disconnected:", socket.id)

    // Remove from waiting players
    const waitingPlayer = waitingPlayers.get(socket.id)
    if (waitingPlayer) {
      clearTimeout(waitingPlayer.timeout)
      waitingPlayers.delete(socket.id)
    }

    // Handle active game disconnection
    const gameId = playerToGame.get(socket.id)
    if (gameId) {
      const game = activeGames.get(gameId)
      if (game && !game.isBot) {
        const opponent = game.player1.socket.id === socket.id ? game.player2 : game.player1
        if (opponent) {
          opponent.socket.emit("opponentDisconnected")
        }
        activeGames.delete(gameId)
        playerToGame.delete(game.player1.socket.id)
        if (game.player2) {
          playerToGame.delete(game.player2.socket.id)
        }
      }
    }
  })
})

// API Routes
app.get("/api/leaderboard", async (req, res) => {
  const leaderboard = await getLeaderboard(10)
  res.json(leaderboard)
})

app.get("/health", (req, res) => {
  res.json({ status: "ok" })
})

const PORT = process.env.PORT || 3001

async function start() {
  await initDatabase()
  await initKafka()

  httpServer.listen(PORT, () => {
    console.log(`[v0] Server running on port ${PORT}`)
  })
}

start()
