import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"

// Save completed game
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { gameId, winner, loser, duration, completedAt } = body

    // Update or insert winner
    await query(
      `
      INSERT INTO players (username, total_games, wins)
      VALUES ($1, 1, 1)
      ON CONFLICT (username) 
      DO UPDATE SET 
        total_games = players.total_games + 1,
        wins = players.wins + 1,
        updated_at = CURRENT_TIMESTAMP
    `,
      [winner],
    )

    // Update or insert loser (skip if it's the bot)
    if (loser !== "AI Bot") {
      await query(
        `
        INSERT INTO players (username, total_games, losses)
        VALUES ($1, 1, 1)
        ON CONFLICT (username)
        DO UPDATE SET 
          total_games = players.total_games + 1,
          losses = players.losses + 1,
          updated_at = CURRENT_TIMESTAMP
      `,
        [loser],
      )
    }

    // Insert game record
    await query(
      `
      INSERT INTO games (game_id, winner, loser, duration, completed_at)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (game_id) DO NOTHING
    `,
      [gameId, winner, loser, duration, completedAt],
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error saving game:", error)
    return NextResponse.json({ error: "Failed to save game" }, { status: 500 })
  }
}
