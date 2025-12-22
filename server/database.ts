import { Pool } from "pg"

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
})

export async function initDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS games (
        id SERIAL PRIMARY KEY,
        player1 VARCHAR(255),
        player2 VARCHAR(255),
        winner VARCHAR(255),
        is_draw BOOLEAN DEFAULT FALSE,
        is_bot_game BOOLEAN DEFAULT FALSE,
        moves_count INTEGER,
        duration_seconds INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS players (
        username VARCHAR(255) PRIMARY KEY,
        wins INTEGER DEFAULT 0,
        losses INTEGER DEFAULT 0,
        draws INTEGER DEFAULT 0,
        total_games INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    console.log("[v0] Database initialized successfully")
  } catch (error) {
    console.error("[v0] Database initialization error:", error)
  }
}

export async function saveGame(gameData: {
  player1: string
  player2: string
  winner: string | null
  isDraw: boolean
  isBotGame: boolean
  movesCount: number
  durationSeconds: number
}) {
  try {
    await pool.query(
      `INSERT INTO games (player1, player2, winner, is_draw, is_bot_game, moves_count, duration_seconds)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        gameData.player1,
        gameData.player2,
        gameData.winner,
        gameData.isDraw,
        gameData.isBotGame,
        gameData.movesCount,
        gameData.durationSeconds,
      ],
    )

    // Update player stats
    if (!gameData.isDraw && gameData.winner) {
      await updatePlayerStats(gameData.winner, "win")
      const loser = gameData.winner === gameData.player1 ? gameData.player2 : gameData.player1
      await updatePlayerStats(loser, "loss")
    } else if (gameData.isDraw) {
      await updatePlayerStats(gameData.player1, "draw")
      await updatePlayerStats(gameData.player2, "draw")
    }
  } catch (error) {
    console.error("[v0] Error saving game:", error)
  }
}

async function updatePlayerStats(username: string, result: "win" | "loss" | "draw") {
  try {
    await pool.query(
      `INSERT INTO players (username, wins, losses, draws, total_games)
       VALUES ($1, $2, $3, $4, 1)
       ON CONFLICT (username) 
       DO UPDATE SET 
         wins = players.wins + $2,
         losses = players.losses + $3,
         draws = players.draws + $4,
         total_games = players.total_games + 1`,
      [username, result === "win" ? 1 : 0, result === "loss" ? 1 : 0, result === "draw" ? 1 : 0],
    )
  } catch (error) {
    console.error("[v0] Error updating player stats:", error)
  }
}

export async function getLeaderboard(limit = 10) {
  try {
    const result = await pool.query(
      `SELECT username, wins, 
       ROW_NUMBER() OVER (ORDER BY wins DESC, total_games ASC) as rank
       FROM players
       ORDER BY wins DESC, total_games ASC
       LIMIT $1`,
      [limit],
    )
    return result.rows
  } catch (error) {
    console.error("[v0] Error fetching leaderboard:", error)
    return []
  }
}
