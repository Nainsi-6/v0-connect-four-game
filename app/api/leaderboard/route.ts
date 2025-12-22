import { NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function GET() {
  try {
    const leaderboard = await query(
      `
      SELECT 
        username,
        total_games,
        wins,
        losses,
        draws,
        ROUND((wins::numeric / NULLIF(total_games, 0) * 100), 1) as win_rate
      FROM players
      WHERE total_games > 0
      ORDER BY wins DESC, win_rate DESC
      LIMIT 10
    `,
    )

    return NextResponse.json(leaderboard)
  } catch (error) {
    console.error("[v0] Error fetching leaderboard:", error)
    return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 })
  }
}
