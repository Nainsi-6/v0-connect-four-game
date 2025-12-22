import type { Server as SocketIOServer, Socket } from "socket.io"
import { GameLogic, type GameState, type Player } from "./game-logic"
import { BotAI } from "./bot-ai"
import { sendAnalyticsEvent } from "./kafka-producer"

interface PlayerInfo {
  id: string
  username: string
  socket: Socket
  isBot?: boolean
}

interface GameSession {
  id: string
  player1: PlayerInfo
  player2: PlayerInfo
  state: GameState
  startTime: Date
  disconnectedPlayers: Map<string, { timeout: NodeJS.Timeout; time: Date }>
}

export class GameManager {
  private games = new Map<string, GameSession>()
  private waitingPlayer: { socket: Socket; username: string; timeout: NodeJS.Timeout } | null = null
  private playerGameMap = new Map<string, string>() // socketId -> gameId

  constructor(private io: SocketIOServer) {}

  handleConnection(socket: Socket) {
    console.log(`[v0] Player connected: ${socket.id}`)

    socket.on("join", (data: { username: string }) => {
      this.handleJoin(socket, data.username)
    })

    socket.on("makeMove", (data: { column: number }) => {
      this.handleMove(socket, data.column)
    })

    socket.on("disconnect", () => {
      this.handleDisconnect(socket)
    })

    socket.on("reconnect_attempt", (data: { username: string; gameId?: string }) => {
      this.handleReconnect(socket, data.username, data.gameId)
    })
  }

  private handleJoin(socket: Socket, username: string) {
    console.log(`[v0] Player ${username} (${socket.id}) attempting to join`)

    // Check if already in a game
    const existingGameId = this.playerGameMap.get(socket.id)
    if (existingGameId) {
      socket.emit("error", { message: "You are already in a game" })
      return
    }

    // If there's a waiting player, start a game
    if (this.waitingPlayer && this.waitingPlayer.socket.id !== socket.id) {
      clearTimeout(this.waitingPlayer.timeout)

      const gameId = this.createGame(this.waitingPlayer.socket, this.waitingPlayer.username, socket, username)

      this.waitingPlayer = null

      console.log(`[v0] Game ${gameId} started between players`)
    } else {
      // Set this player as waiting
      if (this.waitingPlayer) {
        clearTimeout(this.waitingPlayer.timeout)
      }

      socket.emit("waiting", { message: "Waiting for opponent..." })

      // Set timeout to start game with bot after 10 seconds
      const timeout = setTimeout(() => {
        if (this.waitingPlayer?.socket.id === socket.id) {
          console.log(`[v0] Starting bot game for ${username}`)
          this.createBotGame(socket, username)
          this.waitingPlayer = null
        }
      }, 10000)

      this.waitingPlayer = { socket, username, timeout }
    }
  }

  private createGame(socket1: Socket, username1: string, socket2: Socket, username2: string): string {
    const gameId = `game-${Date.now()}-${Math.random().toString(36).substring(7)}`

    const player1: PlayerInfo = { id: socket1.id, username: username1, socket: socket1 }
    const player2: PlayerInfo = { id: socket2.id, username: username2, socket: socket2 }

    const game: GameSession = {
      id: gameId,
      player1,
      player2,
      state: GameLogic.createInitialState(),
      startTime: new Date(),
      disconnectedPlayers: new Map(),
    }

    this.games.set(gameId, game)
    this.playerGameMap.set(socket1.id, gameId)
    this.playerGameMap.set(socket2.id, gameId)

    // Join both players to the game room
    socket1.join(gameId)
    socket2.join(gameId)

    // Notify both players
    this.io.to(gameId).emit("gameStart", {
      gameId,
      player1: { username: username1, playerNumber: 1 },
      player2: { username: username2, playerNumber: 2 },
      board: game.state.board,
      currentPlayer: game.state.currentPlayer,
    })

    // Send player assignments
    socket1.emit("playerAssignment", { playerNumber: 1, opponent: username2 })
    socket2.emit("playerAssignment", { playerNumber: 2, opponent: username1 })

    // Send analytics event
    sendAnalyticsEvent({
      type: "GAME_START",
      gameId,
      player1: username1,
      player2: username2,
      timestamp: new Date().toISOString(),
    })

    return gameId
  }

  private createBotGame(socket: Socket, username: string): string {
    const gameId = `game-${Date.now()}-${Math.random().toString(36).substring(7)}`

    const player1: PlayerInfo = { id: socket.id, username, socket }
    const player2: PlayerInfo = { id: "bot", username: "AI Bot", socket: socket, isBot: true }

    const game: GameSession = {
      id: gameId,
      player1,
      player2,
      state: GameLogic.createInitialState(),
      startTime: new Date(),
      disconnectedPlayers: new Map(),
    }

    this.games.set(gameId, game)
    this.playerGameMap.set(socket.id, gameId)

    socket.join(gameId)

    socket.emit("gameStart", {
      gameId,
      player1: { username, playerNumber: 1 },
      player2: { username: "AI Bot", playerNumber: 2 },
      board: game.state.board,
      currentPlayer: game.state.currentPlayer,
    })

    socket.emit("playerAssignment", { playerNumber: 1, opponent: "AI Bot" })

    // Send analytics event
    sendAnalyticsEvent({
      type: "GAME_START",
      gameId,
      player1: username,
      player2: "AI Bot",
      timestamp: new Date().toISOString(),
    })

    return gameId
  }

  private handleMove(socket: Socket, column: number) {
    const gameId = this.playerGameMap.get(socket.id)
    if (!gameId) {
      socket.emit("error", { message: "You are not in a game" })
      return
    }

    const game = this.games.get(gameId)
    if (!game) {
      socket.emit("error", { message: "Game not found" })
      return
    }

    // Determine which player is making the move
    const playerNumber: Player = game.player1.id === socket.id ? 1 : 2

    // Check if it's this player's turn
    if (game.state.currentPlayer !== playerNumber) {
      socket.emit("error", { message: "Not your turn" })
      return
    }

    // Make the move
    const move = GameLogic.dropDisc(game.state.board, column, playerNumber)
    if (!move) {
      socket.emit("error", { message: "Invalid move - column is full" })
      return
    }

    game.state.lastMove = move

    // Check for win
    if (GameLogic.checkWin(game.state.board, move)) {
      game.state.winner = playerNumber
      this.endGame(game, playerNumber)
      return
    }

    // Check for draw
    if (GameLogic.checkDraw(game.state.board)) {
      game.state.isDraw = true
      this.endGame(game, null)
      return
    }

    // Switch turns
    game.state.currentPlayer = game.state.currentPlayer === 1 ? 2 : 1

    // Emit board update
    this.io.to(gameId).emit("boardUpdate", {
      board: game.state.board,
      currentPlayer: game.state.currentPlayer,
      lastMove: move,
    })

    // Send analytics event
    sendAnalyticsEvent({
      type: "MOVE_MADE",
      gameId,
      player: playerNumber === 1 ? game.player1.username : game.player2.username,
      column,
      timestamp: new Date().toISOString(),
    })

    // If it's the bot's turn, make the bot move
    if (game.player2.isBot && game.state.currentPlayer === 2) {
      setTimeout(() => this.makeBotMove(game), 500) // Small delay for better UX
    }
  }

  private makeBotMove(game: GameSession) {
    const botColumn = BotAI.getBestMove(game.state.board, 2)
    const move = GameLogic.dropDisc(game.state.board, botColumn, 2)

    if (!move) return

    game.state.lastMove = move

    // Check for win
    if (GameLogic.checkWin(game.state.board, move)) {
      game.state.winner = 2
      this.endGame(game, 2)
      return
    }

    // Check for draw
    if (GameLogic.checkDraw(game.state.board)) {
      game.state.isDraw = true
      this.endGame(game, null)
      return
    }

    // Switch turns back to player
    game.state.currentPlayer = 1

    // Emit board update
    this.io.to(game.id).emit("boardUpdate", {
      board: game.state.board,
      currentPlayer: game.state.currentPlayer,
      lastMove: move,
    })

    // Send analytics event
    sendAnalyticsEvent({
      type: "MOVE_MADE",
      gameId: game.id,
      player: "AI Bot",
      column: botColumn,
      timestamp: new Date().toISOString(),
    })
  }

  private async endGame(game: GameSession, winner: Player | null) {
    const duration = Math.floor((Date.now() - game.startTime.getTime()) / 1000)

    if (winner) {
      const winnerUsername = winner === 1 ? game.player1.username : game.player2.username

      this.io.to(game.id).emit("gameOver", {
        winner,
        winnerUsername,
        board: game.state.board,
      })

      // Send analytics event
      sendAnalyticsEvent({
        type: "GAME_END",
        gameId: game.id,
        winner: winnerUsername,
        loser: winner === 1 ? game.player2.username : game.player1.username,
        duration,
        timestamp: new Date().toISOString(),
      })

      // Save to database
      await this.saveGameResult(game, winnerUsername, duration)
    } else {
      this.io.to(game.id).emit("gameOver", {
        draw: true,
        board: game.state.board,
      })

      // Send analytics event
      sendAnalyticsEvent({
        type: "GAME_END",
        gameId: game.id,
        result: "draw",
        duration,
        timestamp: new Date().toISOString(),
      })
    }

    // Clean up
    this.playerGameMap.delete(game.player1.id)
    if (!game.player2.isBot) {
      this.playerGameMap.delete(game.player2.id)
    }
    this.games.delete(game.id)
  }

  private handleDisconnect(socket: Socket) {
    console.log(`[v0] Player disconnected: ${socket.id}`)

    // Check if player was waiting
    if (this.waitingPlayer?.socket.id === socket.id) {
      clearTimeout(this.waitingPlayer.timeout)
      this.waitingPlayer = null
      return
    }

    // Check if player was in a game
    const gameId = this.playerGameMap.get(socket.id)
    if (!gameId) return

    const game = this.games.get(gameId)
    if (!game) return

    // Start 30-second reconnection timer
    const timeout = setTimeout(() => {
      // Player didn't reconnect - forfeit the game
      const winner: Player = game.player1.id === socket.id ? 2 : 1
      this.io.to(gameId).emit("playerForfeited", {
        winner,
        reason: "Player disconnected",
      })
      this.endGame(game, winner)
    }, 30000)

    game.disconnectedPlayers.set(socket.id, { timeout, time: new Date() })

    // Notify other player
    this.io.to(gameId).emit("playerDisconnected", {
      message: "Opponent disconnected. Waiting for reconnection...",
    })
  }

  private handleReconnect(socket: Socket, username: string, gameId?: string) {
    // Find game by gameId or username
    let game: GameSession | undefined

    if (gameId) {
      game = this.games.get(gameId)
    } else {
      // Search by username
      for (const [id, g] of this.games.entries()) {
        if (g.player1.username === username || g.player2.username === username) {
          game = g
          break
        }
      }
    }

    if (!game) {
      socket.emit("error", { message: "Game not found for reconnection" })
      return
    }

    // Find which player is reconnecting
    let playerInfo: PlayerInfo | null = null
    let oldSocketId: string | null = null

    if (game.player1.username === username) {
      playerInfo = game.player1
      oldSocketId = game.player1.id
      game.player1.id = socket.id
      game.player1.socket = socket
    } else if (game.player2.username === username) {
      playerInfo = game.player2
      oldSocketId = game.player2.id
      game.player2.id = socket.id
      game.player2.socket = socket
    }

    if (!playerInfo || !oldSocketId) return

    // Clear disconnect timeout
    const disconnectInfo = game.disconnectedPlayers.get(oldSocketId)
    if (disconnectInfo) {
      clearTimeout(disconnectInfo.timeout)
      game.disconnectedPlayers.delete(oldSocketId)
    }

    // Update mappings
    this.playerGameMap.delete(oldSocketId)
    this.playerGameMap.set(socket.id, game.id)

    // Rejoin room
    socket.join(game.id)

    // Send game state to reconnected player
    socket.emit("gameReconnected", {
      gameId: game.id,
      board: game.state.board,
      currentPlayer: game.state.currentPlayer,
      playerNumber: playerInfo === game.player1 ? 1 : 2,
    })

    // Notify other player
    this.io.to(game.id).emit("playerReconnected", {
      message: "Opponent reconnected!",
    })
  }

  private async saveGameResult(game: GameSession, winner: string, duration: number) {
    try {
      // This will be implemented when we add database
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/games`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: game.id,
          winner,
          loser: winner === game.player1.username ? game.player2.username : game.player1.username,
          duration,
          completedAt: new Date().toISOString(),
        }),
      })

      if (!response.ok) {
        console.error("[v0] Failed to save game result")
      }
    } catch (error) {
      console.error("[v0] Error saving game result:", error)
    }
  }
}
